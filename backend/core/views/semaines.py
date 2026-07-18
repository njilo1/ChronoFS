"""
ViewSet pour les Semaines (CRUD + actions DAR).

Actions implémentées :
- Phase 2 : CRUD basique
- Phase 3 : @cloturer_imports — passe la semaine en IMPORTS_CLOTURES
            pour empêcher de nouveaux envois avant la génération
- Phase 4 : @generer (solver OR-Tools)
- Phase 5 : @export_pdf, @export_docx

DAR : CRUD complet. Chef : lecture seule (utile pour savoir vers quelle
semaine envoyer son fichier).
"""

from django.http import FileResponse, Http404, HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.constants import (
    Role,
    SALLES_AUTORISEES_PAR_TYPE_COURS,
    salle_speciale_requise,
    StatutSemaine,
    TOLERANCE_SURCAPACITE,
    TypeNotification,
    TypeSalle,
)
from core.models import (
    ArchivePlanning, DemandeCours, Departement, ImportPlanning,
    ImportPlanningHistorique, Salle, Seance, Semaine,
)
from core.permissions import IsDAR, IsDARorReadOnly
from core.services.disponibilites import creneaux_bloques
from core.services.notifications import notifier_chefs
from core.scheduling.generation_service import generer_planning, resoudre_config
from core.serializers import (
    ArchivePlanningSerializer,
    SeanceSerializer,
    SemaineSerializer,
)
from core.services.exports_service import exporter_docx, exporter_pdf
from core.services.pdf_service import generate_planning_pdf


class SemaineViewSet(viewsets.ModelViewSet):
    queryset           = Semaine.objects.select_related('annee_academique').all()
    serializer_class   = SemaineSerializer
    permission_classes = [IsDARorReadOnly]
    filterset_fields   = ['statut', 'semestre', 'annee_academique']
    ordering_fields    = ['date_debut']
    ordering           = ['-date_debut']

    # ── Suppression d'une semaine (DAR) ──────────────────────────────────────
    @extend_schema(
        summary="Supprimer une semaine et toutes ses données",
        description=(
            "Réservé au DAR. Supprime la semaine ainsi que, EN CASCADE, ses "
            "imports, demandes de cours, séances et archives. Les fichiers "
            "physiques liés (Excel importés, PDF/DOCX archivés) sont aussi "
            "effacés du disque. Action irréversible — utile pour repartir de "
            "zéro après une erreur de saisie."
        ),
    )
    def destroy(self, request, *args, **kwargs):
        semaine = self.get_object()

        # Effacer les fichiers physiques AVANT la suppression en base, sinon
        # ils resteraient orphelins dans media/ (Django ne les supprime pas seul).
        for imp in ImportPlanning.objects.filter(semaine=semaine):
            if imp.fichier:
                imp.fichier.delete(save=False)
        for himp in ImportPlanningHistorique.objects.filter(semaine=semaine):
            if himp.fichier:
                himp.fichier.delete(save=False)
        for arc in ArchivePlanning.objects.filter(semaine=semaine):
            if arc.fichier_pdf:
                arc.fichier_pdf.delete(save=False)
            if arc.fichier_docx:
                arc.fichier_docx.delete(save=False)

        semaine.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Ouverture des imports (DAR) ──────────────────────────────────────────
    @extend_schema(
        summary="Ouvrir les imports : les chefs peuvent déposer leur fichier",
        description=(
            "Fait passer la semaine de DRAFT à IMPORTS_OUVERTS. C'est cette "
            "transition qui rend la semaine visible côté chef pour le dépôt."
        ),
        responses={200: SemaineSerializer},
    )
    @action(detail=True, methods=['post'], url_path='ouvrir-imports', permission_classes=[IsDAR])
    def ouvrir_imports(self, request, pk=None):
        semaine = self.get_object()

        if semaine.statut != StatutSemaine.DRAFT:
            return Response(
                {'detail': f"Cette semaine est déjà « {semaine.get_statut_display()} ». "
                           "L'ouverture des imports n'est possible que depuis un brouillon."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        semaine.statut = StatutSemaine.IMPORTS_OUVERTS
        semaine.save(update_fields=['statut'])

        notifier_chefs(
            TypeNotification.IMPORTS_OUVERTS,
            titre=f"Imports ouverts — {semaine}",
            message="Vous pouvez désormais déposer le planning de votre département pour cette semaine.",
            lien='/chef/import',
            semaine=semaine,
        )

        return Response(SemaineSerializer(semaine).data)

    # ── Publication du planning (DAR) ────────────────────────────────────────
    @extend_schema(
        summary="Publier le planning généré (visible par les chefs)",
        description=(
            "Fait passer la semaine de GENERE à PUBLIE. Une fois publié, le "
            "planning est consultable par les chefs et exportable en PDF/DOCX."
        ),
        responses={200: SemaineSerializer},
    )
    @action(detail=True, methods=['post'], permission_classes=[IsDAR])
    def publier(self, request, pk=None):
        semaine = self.get_object()

        if semaine.statut != StatutSemaine.GENERE:
            return Response(
                {'detail': f"Cette semaine est « {semaine.get_statut_display()} ». "
                           "Seul un planning généré peut être publié."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        semaine.statut = StatutSemaine.PUBLIE
        semaine.save(update_fields=['statut'])

        notifier_chefs(
            TypeNotification.PLANNING_PUBLIE,
            titre=f"Planning publié — {semaine}",
            message="Le planning de cette semaine est publié et consultable.",
            lien='/chef/planning',
            semaine=semaine,
        )

        return Response(SemaineSerializer(semaine).data)

    # ── Clôture des imports (DAR) ────────────────────────────────────────────
    @extend_schema(
        summary="Clôturer les imports : aucun chef ne peut plus envoyer ni modifier",
        description=(
            "Verrouille la semaine en statut IMPORTS_CLOTURES. À utiliser "
            "juste avant le lancement du solver (Phase 4)."
        ),
        responses={200: SemaineSerializer},
    )
    @action(detail=True, methods=['post'], url_path='cloturer-imports', permission_classes=[IsDAR])
    def cloturer_imports(self, request, pk=None):
        semaine = self.get_object()

        if semaine.statut not in (StatutSemaine.DRAFT, StatutSemaine.IMPORTS_OUVERTS):
            return Response(
                {'detail': f"Cette semaine est déjà « {semaine.get_statut_display()} ». "
                           "La clôture n'est plus pertinente."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        semaine.statut = StatutSemaine.IMPORTS_CLOTURES
        semaine.save(update_fields=['statut'])

        notifier_chefs(
            TypeNotification.IMPORTS_CLOTURES,
            titre=f"Imports clôturés — {semaine}",
            message="La période de dépôt est terminée : vous ne pouvez plus envoyer ni modifier de planning pour cette semaine.",
            lien='/chef/import',
            semaine=semaine,
        )

        return Response(SemaineSerializer(semaine).data)

    # ── Génération du planning (DAR) ─────────────────────────────────────────
    @extend_schema(
        summary="Générer le planning de la semaine (OR-Tools)",
        description=(
            "Régénère intégralement les Seance de la semaine à partir des "
            "DemandeCours actives. Toute édition manuelle préalable est "
            "écrasée. La semaine passe en statut GENERE."
        ),
    )
    @action(detail=True, methods=['post'], permission_classes=[IsDAR])
    def generer(self, request, pk=None):
        semaine = self.get_object()
        if semaine.statut == StatutSemaine.PUBLIE:
            return Response(
                {'detail': "La semaine est déjà publiée. Dépubliez-la avant de regénérer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        time_limit = float(request.data.get('time_limit_sec', 30))
        # Configuration choisie par le DAR dans la modale de génération. Les
        # règles/objectifs verrouillés sont toujours appliqués (cf. resoudre_config).
        regles, objectifs = resoudre_config(
            regles_desactivees=request.data.get('regles_desactivees'),
            regles_activees=request.data.get('regles_activees'),
            objectifs_desactives=request.data.get('objectifs_desactives'),
            objectifs_activees=request.data.get('objectifs_activees'),
        )
        resume = generer_planning(
            semaine, time_limit_sec=time_limit,
            regles=regles, objectifs=objectifs,
            lancee_par=request.user if request.user.is_authenticated else None,
        )
        return Response(resume)

    # ── Placement manuel d'un cours (Assistant de résolution — niveau 2) ──────
    @extend_schema(
        summary="Placer manuellement un cours non placé (suggestion appliquée)",
        description=(
            "Crée une Seance pour une DemandeCours non placée, au jour/créneau/"
            "salle indiqués (typiquement une suggestion de l'Assistant de "
            "résolution). Revalide tous les conflits avant d'écrire — action "
            "déclenchée explicitement par le DAR."
        ),
    )
    @action(detail=True, methods=['post'], url_path='placer-cours', permission_classes=[IsDAR])
    def placer_cours(self, request, pk=None):
        semaine = self.get_object()
        if semaine.statut != StatutSemaine.GENERE:
            return Response(
                {'detail': "Le placement manuel n'est possible qu'après génération (statut « Généré »)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        demande_id = request.data.get('demande_id')
        salle_id   = request.data.get('salle_id')
        try:
            jour    = int(request.data.get('jour'))
            creneau = int(request.data.get('creneau'))
        except (TypeError, ValueError):
            return Response({'detail': "jour/creneau invalides."}, status=status.HTTP_400_BAD_REQUEST)
        if demande_id is None or salle_id is None:
            return Response(
                {'detail': "Paramètres requis : demande_id, jour, creneau, salle_id."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        d = (
            DemandeCours.objects
            .filter(id=demande_id, import_source__semaine=semaine)
            .select_related(
                'filiere__campus_obligatoire', 'filiere__departement',
                'ue', 'enseignant',
            )
            .first()
        )
        if d is None:
            return Response({'detail': "Cours introuvable pour cette semaine."}, status=status.HTTP_404_NOT_FOUND)
        if Seance.objects.filter(semaine=semaine, demande_origine=d).exists():
            return Response({'detail': "Ce cours est déjà placé."}, status=status.HTTP_400_BAD_REQUEST)

        salle = Salle.objects.filter(id=salle_id, disponible=True).select_related('campus').first()
        if salle is None:
            return Response({'detail': "Salle introuvable ou indisponible."}, status=status.HTTP_400_BAD_REQUEST)

        # ── Compatibilité salle ↔ cours ──────────────────────────────────────
        if salle.campus.ville != d.filiere.ville:
            return Response(
                {'detail': f"La salle {salle.nom} n'est pas dans la ville de {d.filiere}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        campus_force = d.filiere.get_campus_contraint()
        if campus_force is not None and salle.campus_id != campus_force.id:
            return Response(
                {'detail': f"{d.filiere} doit se tenir au campus « {campus_force.nom} »."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Salle spéciale SBAA (terrain / labo) : si une est imposée, elle prime ;
        # sinon on retombe sur les types classiques (qui excluent terrain et labo).
        type_special = salle_speciale_requise(
            d.filiere.departement.code, d.type_cours, getattr(d.ue, 'intitule', None),
        )
        if type_special is not None:
            if salle.type_salle != type_special:
                return Response(
                    {'detail': f"Ce TP de {d.filiere} doit se tenir "
                               f"{'au laboratoire' if type_special == TypeSalle.LABO else 'sur le terrain'}."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif salle.type_salle not in SALLES_AUTORISEES_PAR_TYPE_COURS.get(d.type_cours, []):
            return Response(
                {'detail': f"La salle {salle.nom} n'accepte pas un cours de type {d.type_cours}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        effectif = d.effectif_declare or d.filiere.effectif or 1
        if salle.type_salle != TypeSalle.TERRAIN and salle.capacite * (1 + TOLERANCE_SURCAPACITE) < effectif:
            return Response(
                {'detail': f"La salle {salle.nom} ({salle.capacite} places) est trop petite pour {effectif} étudiants."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Indisponibilité de l'enseignant au créneau visé ──────────────────
        if d.enseignant_id and (d.enseignant_id, jour, creneau) in creneaux_bloques(semaine):
            return Response(
                {'detail': f"{d.enseignant.nom} est indisponible à ce créneau."},
                status=status.HTTP_409_CONFLICT,
            )

        # ── Conflits au créneau visé (revalidation au moment de l'application) ─
        autres = Seance.objects.filter(semaine=semaine, jour=jour, creneau=creneau)
        # Le terrain est partageable (plusieurs filières SBAA au même créneau) :
        # on ne bloque l'occupation que pour les salles non partageables.
        if salle.type_salle != TypeSalle.TERRAIN and autres.filter(salle=salle).exists():
            return Response({'detail': f"La salle {salle.nom} est déjà occupée à ce créneau."}, status=status.HTTP_409_CONFLICT)
        if autres.filter(filiere=d.filiere).exists():
            return Response({'detail': f"{d.filiere} a déjà un cours à ce créneau."}, status=status.HTTP_409_CONFLICT)
        if d.enseignant_id and autres.filter(enseignant_id=d.enseignant_id).exists():
            return Response({'detail': f"{d.enseignant.nom} a déjà un cours à ce créneau."}, status=status.HTTP_409_CONFLICT)

        # H9 — la classe doit rester sur un seul campus pour la semaine.
        if Seance.objects.filter(semaine=semaine, filiere=d.filiere).exclude(salle__campus_id=salle.campus_id).exists():
            return Response(
                {'detail': f"{d.filiere} est déjà programmée dans un autre campus cette semaine."},
                status=status.HTTP_409_CONFLICT,
            )
        # H8 — l'enseignant ne change pas de ville le même jour.
        if d.enseignant_id and Seance.objects.filter(
            semaine=semaine, enseignant_id=d.enseignant_id, jour=jour,
        ).exclude(salle__campus__ville=salle.campus.ville).exists():
            return Response(
                {'detail': f"{d.enseignant.nom} enseigne déjà dans une autre ville ce jour-là."},
                status=status.HTTP_409_CONFLICT,
            )

        seance = Seance.objects.create(
            semaine=semaine, demande_origine=d,
            filiere=d.filiere, ue=d.ue, enseignant=d.enseignant,
            salle=salle, jour=jour, creneau=creneau, type_cours=d.type_cours,
            modifie_manuellement=True, modifie_le=timezone.now(), modifie_par=request.user,
        )
        return Response(SeanceSerializer(seance).data, status=status.HTTP_201_CREATED)

    # ── Séances impactées par une absence (Phase C) ──────────────────────────
    @extend_schema(
        summary="Séances impactées par une indisponibilité d'enseignant",
        responses={200: SeanceSerializer(many=True)},
    )
    @action(detail=True, methods=['get'], url_path='seances-impactees')
    def seances_impactees(self, request, pk=None):
        semaine = self.get_object()
        bloque  = creneaux_bloques(semaine)
        seances = (
            Seance.objects
            .filter(semaine=semaine, enseignant__isnull=False)
            .select_related('filiere', 'ue', 'enseignant', 'salle__campus')
        )
        impactees = [s for s in seances if (s.enseignant_id, s.jour, s.creneau) in bloque]
        return Response(SeanceSerializer(impactees, many=True).data)

    # ── Cours récupérables dans l'espace libre (Phase D) ─────────────────────
    @extend_schema(summary="Cours non placés re-posables dans l'espace libre actuel")
    @action(detail=True, methods=['get'], url_path='non-places')
    def non_places(self, request, pk=None):
        from core.scheduling.conseiller import calculer_recuperables
        semaine = self.get_object()
        return Response(calculer_recuperables(semaine))

    # ── Annuler une séance (Phase C : absence = suppression simple) ───────────
    @extend_schema(summary="Annuler (supprimer) une séance de la semaine")
    @action(detail=True, methods=['post'], url_path='annuler-seance', permission_classes=[IsDAR])
    def annuler_seance(self, request, pk=None):
        semaine    = self.get_object()
        seance_id  = request.data.get('seance_id')
        seance = Seance.objects.filter(id=seance_id, semaine=semaine).first()
        if seance is None:
            return Response({'detail': "Séance introuvable pour cette semaine."}, status=status.HTTP_404_NOT_FOUND)
        seance.delete()
        return Response({'detail': 'Séance annulée.'})

    # ── Lister les séances d'une semaine ─────────────────────────────────────
    @extend_schema(
        summary="Toutes les séances planifiées de cette semaine",
        responses={200: SeanceSerializer(many=True)},
    )
    @action(detail=True, methods=['get'])
    def seances(self, request, pk=None):
        semaine = self.get_object()
        qs = (
            Seance.objects.filter(semaine=semaine)
            .select_related('filiere', 'ue', 'enseignant', 'salle__campus', 'modifie_par')
            .order_by('jour', 'creneau', 'salle__nom')
        )
        # Le chef ne voit que les séances de ses filières
        if request.user.role == Role.CHEF_DEPT:
            qs = qs.filter(filiere__departement_id=request.user.departement_id)
        return Response(SeanceSerializer(qs, many=True).data)

    # ── Taux de programmation par département ─────────────────────────────────
    @extend_schema(
        summary="Taux de programmation des cours par département pour cette semaine",
        description=(
            "Pour chaque département ayant déposé des demandes : nombre total "
            "de cours demandés, nombre effectivement placé par le solver et "
            "taux (%). Les départements les moins programmés apparaissent en "
            "tête. Un chef ne voit que son propre département."
        ),
    )
    @action(detail=True, methods=['get'], url_path='taux-programmation',
            permission_classes=[IsAuthenticated])
    def taux_programmation(self, request, pk=None):
        semaine = self.get_object()

        demandes = DemandeCours.objects.filter(import_source__semaine=semaine)
        # Une demande est « placée » dès qu'une Seance la référence pour cette
        # semaine (demande_origine). On compte distinctement par sécurité.
        placees_ids = set(
            Seance.objects
            .filter(semaine=semaine, demande_origine__isnull=False)
            .values_list('demande_origine_id', flat=True)
        )

        # Restriction chef → son seul département.
        depts_filtre = None
        if request.user.role == Role.CHEF_DEPT:
            depts_filtre = {request.user.departement_id}

        # Agrégation en mémoire (volumétrie hebdomadaire modeste).
        stats: dict[int, dict] = {}
        for d in demandes.values('id', 'filiere__departement_id'):
            dept_id = d['filiere__departement_id']
            if depts_filtre is not None and dept_id not in depts_filtre:
                continue
            s = stats.setdefault(dept_id, {'total': 0, 'placees': 0})
            s['total'] += 1
            if d['id'] in placees_ids:
                s['placees'] += 1

        depts = {dep.id: dep for dep in Departement.objects.filter(id__in=stats.keys())}
        resultat = []
        for dept_id, s in stats.items():
            dep = depts.get(dept_id)
            total, placees = s['total'], s['placees']
            resultat.append({
                'departement_id': dept_id,
                'code': dep.code if dep else '—',
                'nom':  dep.nom  if dep else '—',
                'total': total,
                'placees': placees,
                'taux': round(placees / total * 100) if total else 0,
            })

        # Les départements les moins programmés d'abord (priorité d'attention).
        resultat.sort(key=lambda r: (r['taux'], r['code']))
        return Response(resultat)

    # ── Export PDF (DAR) ─────────────────────────────────────────────────────
    @extend_schema(
        summary="Exporter le planning de la semaine en PDF officiel UEB",
        description=(
            "Génère le PDF, crée un ArchivePlanning (version+1) et renvoie "
            "le fichier en téléchargement. Toutes les versions précédentes "
            "restent accessibles via /archives/."
        ),
    )
    @action(detail=True, methods=['post'], url_path='export-pdf', permission_classes=[IsDAR])
    def export_pdf(self, request, pk=None):
        semaine = self.get_object()
        contenu, nom, _archive = exporter_pdf(semaine, request.user)
        response = HttpResponse(contenu, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{nom}"'
        return response

    # ── Export PDF personnel (chef : son département, sans archivage) ─────────
    @extend_schema(
        summary="Télécharger le PDF du planning (filtré sur son département pour un chef)",
        description=(
            "Génère et renvoie le PDF sans créer d'ArchivePlanning. Pour un "
            "chef de département, le PDF ne contient que les séances de SON "
            "département. Le DAR obtient le planning complet."
        ),
    )
    @action(detail=True, methods=['post'], url_path='export-pdf-perso', permission_classes=[IsAuthenticated])
    def export_pdf_perso(self, request, pk=None):
        semaine = self.get_object()

        if semaine.statut not in (StatutSemaine.GENERE, StatutSemaine.PUBLIE):
            return Response(
                {'detail': "Le planning de cette semaine n'est pas encore généré."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Chef → uniquement son département ; DAR → planning complet.
        departement = None
        if request.user.role == Role.CHEF_DEPT:
            departement = request.user.departement

        contenu, nom = generate_planning_pdf(semaine, departement=departement)
        response = HttpResponse(contenu, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{nom}"'
        return response

    # ── Export DOCX (DAR) ────────────────────────────────────────────────────
    @extend_schema(
        summary="Exporter le planning de la semaine en Word (.docx)",
    )
    @action(detail=True, methods=['post'], url_path='export-docx', permission_classes=[IsDAR])
    def export_docx(self, request, pk=None):
        semaine = self.get_object()
        contenu, nom, _archive = exporter_docx(semaine, request.user)
        response = HttpResponse(
            contenu,
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        )
        response['Content-Disposition'] = f'attachment; filename="{nom}"'
        return response

    # ── Liste des archives d'export (toute version) ──────────────────────────
    @extend_schema(
        summary="Liste des exports archivés pour cette semaine",
        responses={200: ArchivePlanningSerializer(many=True)},
    )
    @action(detail=True, methods=['get'])
    def archives(self, request, pk=None):
        semaine = self.get_object()
        archives = (
            ArchivePlanning.objects
            .filter(semaine=semaine)
            .select_related('exporte_par')
            .order_by('-version')
        )
        ser = ArchivePlanningSerializer(archives, many=True, context={'request': request})
        return Response(ser.data)

    # ── Télécharger une archive (PDF ou DOCX) ────────────────────────────────
    @extend_schema(
        summary="Télécharger le fichier PDF ou DOCX d'une archive",
        description="Paramètre ?format=pdf (défaut) ou docx.",
    )
    @action(
        detail=True,
        methods=['get'],
        url_path=r'archives/(?P<archive_id>\d+)/telecharger',
        permission_classes=[IsDAR],
    )
    def telecharger_archive(self, request, pk=None, archive_id=None):
        archive = get_object_or_404(
            ArchivePlanning.objects.select_related('semaine'),
            id=archive_id, semaine_id=pk,
        )

        # NB : on lit `type` et non `format` — ce dernier est réservé par DRF
        # pour la négociation de contenu (sinon 404 avant d'atteindre la vue).
        fmt = (request.query_params.get('type') or 'pdf').lower()
        if fmt == 'docx':
            fichier = archive.fichier_docx
            content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ext = 'docx'
        else:
            fichier = archive.fichier_pdf
            content_type = 'application/pdf'
            ext = 'pdf'

        if not fichier:
            raise Http404(f"Cette archive n'a pas de fichier {ext.upper()}.")

        nom = f'Planning_v{archive.version}_{archive.semaine.date_debut:%Y-%m-%d}.{ext}'
        response = FileResponse(fichier.open('rb'), content_type=content_type)
        response['Content-Disposition'] = f'attachment; filename="{nom}"'
        return response

    # ── Supprimer UNE archive (fichiers physiques + ligne BD) ────────────────
    @extend_schema(
        summary="Supprimer définitivement une archive d'export",
        description=(
            "Supprime à la fois les fichiers PDF/DOCX du disque et la ligne "
            "dans la base de données. Action réservée au DAR, irréversible."
        ),
    )
    @action(
        detail=True,
        methods=['delete'],
        url_path=r'archives/(?P<archive_id>\d+)',
        permission_classes=[IsDAR],
    )
    def supprimer_archive(self, request, pk=None, archive_id=None):
        semaine = self.get_object()
        try:
            archive = ArchivePlanning.objects.get(id=archive_id, semaine=semaine)
        except ArchivePlanning.DoesNotExist:
            return Response(
                {'detail': "Archive introuvable pour cette semaine."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Suppression des fichiers physiques avant le delete de la row
        if archive.fichier_pdf:
            archive.fichier_pdf.delete(save=False)
        if archive.fichier_docx:
            archive.fichier_docx.delete(save=False)
        archive.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Supprimer TOUTES les archives de la semaine ──────────────────────────
    @extend_schema(
        summary="Purger toutes les archives d'export d'une semaine",
        description=(
            "Supprime toutes les versions PDF/DOCX archivées de la semaine, "
            "fichiers physiques et lignes BD. Irréversible — réservé DAR."
        ),
    )
    @action(
        detail=True,
        methods=['delete'],
        url_path='archives-tout',
        permission_classes=[IsDAR],
    )
    def purger_archives(self, request, pk=None):
        semaine = self.get_object()
        archives = list(ArchivePlanning.objects.filter(semaine=semaine))
        count = len(archives)
        for archive in archives:
            if archive.fichier_pdf:
                archive.fichier_pdf.delete(save=False)
            if archive.fichier_docx:
                archive.fichier_docx.delete(save=False)
            archive.delete()
        return Response({'supprimees': count}, status=status.HTTP_200_OK)
