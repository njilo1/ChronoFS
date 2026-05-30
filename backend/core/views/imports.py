"""
Vues pour le workflow d'import Excel hebdomadaire.

Routes exposées :
- GET  /api/template-excel/?semaine=<id>            (chef ou DAR)
- POST /api/imports/preview/                        (chef, dry_run)
- POST /api/imports/                                (chef, dépôt réel)
- GET  /api/imports/mine/                           (chef, ses imports)
- DELETE /api/imports/<id>/                         (chef si dépôt non clôturé)
- GET  /api/imports/                                (DAR, tous)
- GET  /api/imports/<id>/historique/                (DAR)
"""

from __future__ import annotations

from django.http import FileResponse, Http404, HttpResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.constants import Role, StatutSemaine, TypeNotification
from core.models import (
    Departement,
    Enseignant,
    ImportPlanning,
    ImportPlanningHistorique,
    Semaine,
    UE,
)
from core.permissions import IsDAR
from core.serializers import (
    ImportPlanningHistoriqueSerializer,
    ImportPlanningSerializer,
)
from core.services.excel_service import generate_template_excel, parse_import_excel
from core.services.imports_service import confirmer_import
from core.services.notifications import notifier_dar
from core.services.verif_imports import analyser_avertissements


# ── Helpers ──────────────────────────────────────────────────────────────────
def _resoudre_semaine(request) -> Semaine:
    """Récupère la semaine ciblée (paramètre `semaine` GET ou champ form)."""
    sid = request.query_params.get('semaine') or request.data.get('semaine')
    if not sid:
        raise ValidationError({'semaine': "Précisez l'ID de la semaine ciblée."})
    try:
        return Semaine.objects.select_related('annee_academique').get(pk=int(sid))
    except (Semaine.DoesNotExist, ValueError, TypeError):
        raise ValidationError({'semaine': f"Aucune semaine avec l'identifiant « {sid} »."})


def _resoudre_departement(request) -> Departement:
    """
    Chef → son propre département.
    DAR  → doit fournir `?departement=<id>` (sinon erreur 400).
    """
    user = request.user
    if user.role == Role.CHEF_DEPT:
        if not user.departement_id:
            raise PermissionDenied("Aucun département n'est associé à votre compte.")
        return user.departement
    # DAR
    did = request.query_params.get('departement') or request.data.get('departement')
    if not did:
        raise ValidationError({'departement': "En tant que DAR, précisez l'ID du département."})
    try:
        return Departement.objects.get(pk=int(did))
    except (Departement.DoesNotExist, ValueError, TypeError):
        raise ValidationError({'departement': f"Aucun département avec l'identifiant « {did} »."})


def _serialiser_rapport(semaine: Semaine, dept: Departement, rapport) -> dict:
    """
    Met le rapport de parsing au format attendu par le frontend chef :
    `nb_ues`, `ues` (code/intitulé/enseignant) et `erreurs` (messages lisibles).
    """
    ue_ids  = {l.ue_id for l in rapport.lignes_valides if l.ue_id}
    ens_ids = {l.enseignant_id for l in rapport.lignes_valides if l.enseignant_id}
    ues_map = {u.id: u for u in UE.objects.filter(id__in=ue_ids)}
    ens_map = {e.id: e for e in Enseignant.objects.filter(id__in=ens_ids)}

    ues_apercu = []
    for ligne in rapport.lignes_valides:
        u = ues_map.get(ligne.ue_id)
        e = ens_map.get(ligne.enseignant_id)
        ues_apercu.append({
            'code':       u.code if u else '—',
            'intitule':   u.intitule if u else '—',
            'enseignant': f'{e.get_grade_display()} {e.nom}' if e else 'Non assigné',
            'erreur':     None,
        })

    erreurs_txt = [f"Ligne {er['ligne']} : {er['message']}" for er in rapport.erreurs]

    # Avertissements (non bloquants) : conflits inter-départements détectés
    # par la vérification intelligente, au-dessus du parsing.
    avertissements = analyser_avertissements(rapport, dept, semaine)

    return {
        'semaine':        semaine.id,
        'departement':    dept.id,
        'nb_ues':         rapport.lignes_ok,
        'nb_erreurs':     rapport.lignes_erreur,
        'ues':            ues_apercu,
        'erreurs':        erreurs_txt,
        'avertissements': [f"Ligne {a['ligne']} : {a['message']}" for a in avertissements],
        'rapport':        rapport.to_json(),
    }


def _verifier_semaine_ouverte(semaine: Semaine):
    """Refuse les actions d'import si la semaine n'est plus en collecte."""
    if semaine.statut not in (StatutSemaine.DRAFT, StatutSemaine.IMPORTS_OUVERTS):
        raise ValidationError(
            f"Cette semaine est désormais « {semaine.get_statut_display()} ». "
            "Les imports ne sont plus acceptés."
        )


# ── 1. Téléchargement du template ────────────────────────────────────────────
@extend_schema(
    summary="Télécharger le modèle Excel pré-rempli pour son département",
    parameters=[
        OpenApiParameter('semaine',     int, required=True,
                         description="ID de la semaine cible."),
        OpenApiParameter('departement', int, required=False,
                         description="DAR uniquement : ID du département cible."),
    ],
    responses={200: OpenApiResponse(description="Fichier .xlsx")},
)
class TemplateExcelView(APIView):
    """GET /api/template-excel/?semaine=<id>[&departement=<id>]"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        semaine = _resoudre_semaine(request)
        dept    = _resoudre_departement(request)

        contenu, nom = generate_template_excel(dept, semaine)

        response = HttpResponse(
            contenu,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="{nom}"'
        return response


# ── 2. Preview d'un import (dry-run) ─────────────────────────────────────────
@extend_schema(
    summary="Aperçu d'un fichier d'import sans rien enregistrer",
    description=(
        "Renvoie le même rapport que l'upload réel mais ne crée AUCUNE donnée. "
        "Permet au chef de corriger ses erreurs avant l'envoi définitif."
    ),
)
class ImportPreviewView(APIView):
    """POST /api/imports/preview/ — body multipart : fichier + semaine"""

    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]

    def post(self, request):
        if request.user.role != Role.CHEF_DEPT:
            raise PermissionDenied("Seuls les chefs de département peuvent prévisualiser un import.")

        fichier = request.FILES.get('fichier')
        if not fichier:
            raise ValidationError({'fichier': 'Aucun fichier reçu.'})

        semaine = _resoudre_semaine(request)
        dept    = _resoudre_departement(request)
        _verifier_semaine_ouverte(semaine)

        rapport = parse_import_excel(fichier.read(), dept)

        return Response(_serialiser_rapport(semaine, dept, rapport))


# ── 3. ViewSet principal pour les imports ───────────────────────────────────
class ImportPlanningViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET    /api/imports/                      → liste (DAR : tout, chef : 403)
    GET    /api/imports/<id>/                 → détail
    POST   /api/imports/                      → upload réel (chef)
    DELETE /api/imports/<id>/                 → supprimer (chef si semaine ouverte)
    GET    /api/imports/mine/                 → mes imports (chef)
    GET    /api/imports/<id>/historique/      → versions archivées (DAR)
    """

    serializer_class   = ImportPlanningSerializer
    permission_classes = [IsAuthenticated]
    parser_classes     = [MultiPartParser, FormParser]
    filterset_fields   = ['semaine', 'departement', 'statut_parsing']
    ordering           = ['-uploaded_at']

    # ── Routage des permissions selon l'action ──────────────────────────────
    def get_permissions(self):
        # POST (création) et DELETE : chef OU DAR. Les détails de qui peut
        # quoi sont gérés dans les méthodes elles-mêmes pour éviter une
        # explosion de classes de permission.
        if self.action in ('list', 'historique'):
            return [IsDAR()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = ImportPlanning.objects.select_related(
            'semaine', 'departement', 'uploaded_by',
        ).prefetch_related('demandes')

        # Le chef ne voit que les imports de son département.
        if self.request.user.is_authenticated and self.request.user.role == Role.CHEF_DEPT:
            qs = qs.filter(departement_id=self.request.user.departement_id)
        return qs

    # ── Upload réel ──────────────────────────────────────────────────────────
    @extend_schema(
        summary="Envoyer un planning pour la semaine en cours",
        request={'multipart/form-data': {'type': 'object', 'properties': {
            'fichier': {'type': 'string', 'format': 'binary'},
            'semaine': {'type': 'integer'},
        }}},
        responses={201: ImportPlanningSerializer},
    )
    def create(self, request):
        if request.user.role != Role.CHEF_DEPT:
            raise PermissionDenied("Seuls les chefs de département peuvent déposer un planning.")

        fichier = request.FILES.get('fichier')
        if not fichier:
            raise ValidationError({'fichier': 'Aucun fichier reçu.'})

        semaine = _resoudre_semaine(request)
        dept    = _resoudre_departement(request)
        _verifier_semaine_ouverte(semaine)

        contenu = fichier.read()
        rapport = parse_import_excel(contenu, dept)
        if rapport.lignes_ok == 0:
            return Response({
                'message': "Aucune ligne valide n'a pu être enregistrée. Corrigez les "
                           "erreurs ci-dessous puis renvoyez le fichier.",
                'rapport': rapport.to_json(),
            }, status=status.HTTP_400_BAD_REQUEST)

        nouveau = confirmer_import(
            user           = request.user,
            semaine        = semaine,
            departement    = dept,
            fichier_nom    = fichier.name,
            fichier_bytes  = contenu,
            rapport        = rapport,
        )

        notifier_dar(
            TypeNotification.PLANNING_RECU,
            titre=f"Planning reçu — {dept.nom}",
            message=f"Le département « {dept.nom} » a envoyé son planning pour la {semaine} "
                    f"({rapport.lignes_ok} cours).",
            lien='/dar/imports',
            semaine=semaine,
        )

        data = ImportPlanningSerializer(nouveau, context={'request': request}).data
        if rapport.lignes_erreur:
            data['message'] = (
                f"Envoi reçu : {rapport.lignes_ok} ligne(s) enregistrée(s), "
                f"{rapport.lignes_erreur} ligne(s) refusée(s) (voir détails)."
            )
        else:
            data['message'] = f"Envoi reçu avec succès : {rapport.lignes_ok} ligne(s) enregistrée(s)."

        return Response(data, status=status.HTTP_201_CREATED)

    # ── Suppression ──────────────────────────────────────────────────────────
    def destroy(self, request, pk=None):
        instance = get_object_or_404(self.get_queryset(), pk=pk)

        # Un chef ne peut supprimer que SES dépôts.
        if request.user.role == Role.CHEF_DEPT:
            if instance.departement_id != request.user.departement_id:
                raise PermissionDenied("Cet import ne vous appartient pas.")
            _verifier_semaine_ouverte(instance.semaine)

        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Téléchargement du fichier Excel déposé ───────────────────────────────
    @extend_schema(
        summary="Télécharger le fichier .xlsx déposé pour cet import",
        responses={200: OpenApiResponse(description="Fichier .xlsx")},
    )
    @action(detail=True, methods=['get'])
    def fichier(self, request, pk=None):
        instance = self.get_object()  # queryset déjà scopé (chef = son dept)
        if not instance.fichier:
            raise ValidationError({'detail': "Aucun fichier n'est associé à cet import."})

        instance.fichier.open('rb')
        try:
            contenu = instance.fichier.read()
        finally:
            instance.fichier.close()

        nom = instance.fichier.name.split('/')[-1]
        response = HttpResponse(
            contenu,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="{nom}"'
        return response

    # ── /imports/mine/ — vue dédiée chef ────────────────────────────────────
    @extend_schema(summary="Mes imports (envois du chef connecté)")
    @action(detail=False, methods=['get'])
    def mine(self, request):
        if request.user.role != Role.CHEF_DEPT:
            raise PermissionDenied("Cette ressource n'est destinée qu'aux chefs de département.")

        qs = self.get_queryset()  # déjà filtré par dept
        page = self.paginate_queryset(qs)
        ser  = self.get_serializer(page or qs, many=True)
        return self.get_paginated_response(ser.data) if page else Response(ser.data)

    # ── Historique d'un import (DAR) ─────────────────────────────────────────
    @extend_schema(
        summary="Versions précédentes (remplacées) pour cet import",
        responses={200: ImportPlanningHistoriqueSerializer(many=True)},
    )
    @action(detail=True, methods=['get'])
    def historique(self, request, pk=None):
        actif = self.get_object()
        versions = (
            ImportPlanningHistorique.objects
            .filter(semaine=actif.semaine, departement=actif.departement)
            .order_by('-version')
        )
        ser = ImportPlanningHistoriqueSerializer(versions, many=True, context={'request': request})
        return Response(ser.data)
