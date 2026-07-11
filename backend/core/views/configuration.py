"""
Vues de configuration du solver (super-admin) + agrégats du dashboard.

- `RegleSolverViewSet`      : CRUD des règles (verrouillées non supprimables).
- `FonctionObjectifViewSet` : CRUD des objectifs + réordonnancement.
- `JournalGenerationViewSet`: lecture de l'audit des générations.
- `StatsSuperAdminView`     : statistiques agrégées du tableau de bord.

Lecture des règles/objectifs ouverte au DAR (pour la modale de génération) ;
écriture réservée au super-admin (`IsSuperAdminOrReadOnlyConfig`).
"""

from django.db.models import Avg, Count, Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from core.constants import (
    CategorieRegle,
    Role,
    StatutEnseignant,
    TypeRegle,
)
from core.models import (
    Departement,
    Enseignant,
    Filiere,
    FonctionObjectif,
    JournalGeneration,
    RegleSolver,
    Salle,
    User,
)
from core.permissions import IsSuperAdmin, IsSuperAdminOrReadOnlyConfig
from core.scheduling.registre import catalogue_templates
from core.serializers.configuration import (
    FonctionObjectifSerializer,
    JournalGenerationSerializer,
    RegleSolverSerializer,
)


class RegleSolverViewSet(viewsets.ModelViewSet):
    """CRUD des règles du solver. Les verrouillées ne se suppriment pas."""

    queryset           = RegleSolver.objects.all()
    serializer_class   = RegleSolverSerializer
    permission_classes = [IsSuperAdminOrReadOnlyConfig]
    filterset_fields   = ['categorie', 'type_regle', 'verrouillee']
    search_fields      = ['code', 'nom']
    ordering           = ['ordre', 'code']

    def destroy(self, request, *args, **kwargs):
        regle = self.get_object()
        if regle.verrouillee:
            return Response(
                {'detail': "Cette règle est verrouillée (fondatrice) et ne peut pas être supprimée."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], permission_classes=[IsSuperAdmin])
    def templates(self, request):
        """Catalogue des templates de règles dynamiques (schémas de paramètres)."""
        return Response(catalogue_templates())


class FonctionObjectifViewSet(viewsets.ModelViewSet):
    """CRUD des fonctions objectif + réordonnancement de la priorité."""

    queryset           = FonctionObjectif.objects.all()
    serializer_class   = FonctionObjectifSerializer
    permission_classes = [IsSuperAdminOrReadOnlyConfig]
    ordering           = ['priorite', 'code']

    def destroy(self, request, *args, **kwargs):
        objectif = self.get_object()
        if objectif.verrouillee:
            return Response(
                {'detail': "Cet objectif est verrouillé (fondateur) et ne peut pas être supprimé."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['post'], permission_classes=[IsSuperAdmin])
    def reordonner(self, request):
        """
        Réordonne les priorités. Body : `{"ordre": [<id1>, <id2>, ...]}` — la
        position dans la liste (1-based) devient la nouvelle `priorite`.
        """
        ids = request.data.get('ordre') or []
        if not isinstance(ids, list):
            return Response({'detail': "`ordre` doit être une liste d'identifiants."},
                            status=status.HTTP_400_BAD_REQUEST)
        for position, obj_id in enumerate(ids, start=1):
            FonctionObjectif.objects.filter(pk=obj_id).update(priorite=position, ordre=position)
        objs = FonctionObjectif.objects.all()
        return Response(FonctionObjectifSerializer(objs, many=True).data)


class JournalGenerationViewSet(viewsets.ReadOnlyModelViewSet):
    """Historique (audit) des générations — lecture seule, super-admin."""

    queryset           = JournalGeneration.objects.select_related('semaine', 'lancee_par').all()
    serializer_class   = JournalGenerationSerializer
    permission_classes = [IsSuperAdmin]
    filterset_fields   = ['semaine', 'statut_solver']
    ordering           = ['-lancee_le']


class StatsSuperAdminView(APIView):
    """Statistiques agrégées pour le tableau de bord super-admin."""

    permission_classes = [IsSuperAdmin]

    def get(self, request):
        # Comptes par rôle
        comptes = User.objects.aggregate(
            total=Count('id'),
            dar=Count('id', filter=Q(role=Role.DAR)),
            chefs=Count('id', filter=Q(role=Role.CHEF_DEPT)),
            superadmins=Count('id', filter=Q(role=Role.SUPERADMIN)),
            actifs=Count('id', filter=Q(is_active=True)),
        )

        # Enseignants (permanents / vacataires)
        enseignants = Enseignant.objects.aggregate(
            total=Count('id'),
            permanents=Count('id', filter=Q(statut=StatutEnseignant.PERMANENT)),
            vacataires=Count('id', filter=Q(statut=StatutEnseignant.VACATAIRE)),
        )

        # Règles
        regles_qs = RegleSolver.objects.all()
        regles = {
            'total':     regles_qs.count(),
            'actives':   regles_qs.filter(Q(verrouillee=True) | Q(active_par_defaut=True)).count(),
            'statiques': regles_qs.filter(categorie=CategorieRegle.STATIQUE).count(),
            'dynamiques': regles_qs.filter(categorie=CategorieRegle.DYNAMIQUE).count(),
            'dures':     regles_qs.filter(type_regle=TypeRegle.DURE).count(),
            'souples':   regles_qs.filter(type_regle=TypeRegle.SOUPLE).count(),
        }

        # Objectifs (ordonnés — cascade lexicographique)
        objectifs = [
            {
                'code': o.code, 'nom': o.nom, 'priorite': o.priorite,
                'sens': o.sens, 'verrouillee': o.verrouillee,
                'actif': o.verrouillee or o.active_par_defaut,
            }
            for o in FonctionObjectif.objects.order_by('priorite', 'code')
        ]

        # Série des générations (30 dernières) + moyennes
        journal_qs = JournalGeneration.objects.order_by('-lancee_le')
        recents = list(journal_qs[:30])
        recents.reverse()  # chronologique pour le graphe
        serie = [
            {
                'date':     j.lancee_le.strftime('%d/%m'),
                'taux':     round(j.taux, 1),
                'duree_ms': j.duree_ms,
                'placees':  j.nb_placees,
                'demandes': j.nb_demandes,
            }
            for j in recents
        ]
        agg = journal_qs.aggregate(duree_moy=Avg('duree_ms'), taux_moy=Avg('taux'))
        dernier = journal_qs.first()

        return Response({
            'comptes':     comptes,
            'enseignants': enseignants,
            'departements': Departement.objects.count(),
            'filieres':    Filiere.objects.count(),
            'salles':      Salle.objects.count(),
            'regles':      regles,
            'objectifs':   objectifs,
            'generations': {
                'total':          journal_qs.count(),
                'serie':          serie,
                'duree_moy_ms':   round(agg['duree_moy'] or 0),
                'taux_moy':       round(agg['taux_moy'] or 0, 1),
                'dernier_statut': dernier.statut_solver if dernier else None,
            },
        })
