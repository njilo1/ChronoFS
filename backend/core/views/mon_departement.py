"""
Endpoints "Mon département" — réservés aux CHEF_DEPT.

Un chef ne voit / ne modifie QUE ce qui appartient à son département :
- Les UE des filières de son département
- Les enseignants rattachés à son département

Le filtrage est appliqué dans `get_queryset()` (lecture) ET les
validations de création empêchent un chef de rattacher une UE à une
filière d'un autre département.
"""

from rest_framework import serializers, viewsets
from rest_framework.exceptions import PermissionDenied, ValidationError

from core.constants import Creneau, Jour, StatutSemaine, TypeNotification
from core.models import Enseignant, Filiere, IndisponibiliteEnseignant, Seance, UE
from core.permissions import IsChefDept, ScopedToOwnDept
from core.serializers import (
    EnseignantSerializer,
    FiliereSerializer,
    IndisponibiliteSerializer,
    UESerializer,
)
from core.services.notifications import notifier_dar


# ─── UE du chef ──────────────────────────────────────────────────────────────
class MesUESerializer(UESerializer):
    """
    Surcharge : la `filiere` doit appartenir au département du chef.

    Filtrage du queryset visible (drop-down) + validation à la création
    pour empêcher la triche par envoi d'un id arbitraire.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request') if hasattr(self, 'context') else None
        if request and request.user.is_authenticated and request.user.departement_id:
            self.fields['filiere'].queryset = (
                self.fields['filiere'].queryset
                .filter(departement_id=request.user.departement_id)
            )

    def validate_filiere(self, value):
        request = self.context.get('request')
        if request and value.departement_id != request.user.departement_id:
            raise serializers.ValidationError(
                "Cette filière n'appartient pas à votre département."
            )
        return value


class MesUEsViewSet(viewsets.ModelViewSet):
    """CRUD des UE de mon département (chef uniquement)."""

    # queryset par défaut pour que drf-spectacular puisse introspecter le
    # modèle sans tomber sur AnonymousUser au moment de la génération du
    # schéma OpenAPI. Le vrai queryset est dans get_queryset().
    queryset           = UE.objects.none()
    serializer_class   = MesUESerializer
    permission_classes = [IsChefDept, ScopedToOwnDept]
    search_fields      = ['code', 'intitule']
    filterset_fields   = ['filiere', 'filiere__niveau', 'filiere__ville']
    ordering_fields    = ['code', 'intitule']
    ordering           = ['code']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return UE.objects.none()
        dept_id = self.request.user.departement_id
        return (
            UE.objects
            .select_related('filiere__departement')
            .filter(filiere__departement_id=dept_id)
        )


# ─── Enseignants du chef ─────────────────────────────────────────────────────
class MesEnseignantsSerializer(EnseignantSerializer):
    """
    Surcharge : à la création, le chef rattache automatiquement
    l'enseignant à son département. Il peut ajouter d'autres départements
    (cas d'enseignant inter-dept) mais le sien est obligatoire.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Le champ M2M est laissé optionnel — l'ajout du dept du chef est
        # fait dans create() / update() pour qu'il ne soit JAMAIS retiré.
        self.fields['departements'].required = False

    def create(self, validated_data):
        request = self.context['request']
        dept_id = request.user.departement_id
        depts   = list(validated_data.pop('departements', []))

        # On force l'inclusion du département du chef.
        if not any(d.pk == dept_id for d in depts):
            from core.models import Departement
            depts.append(Departement.objects.get(pk=dept_id))

        enseignant = Enseignant.objects.create(**validated_data)
        enseignant.departements.set(depts)
        return enseignant

    def update(self, instance, validated_data):
        request = self.context['request']
        dept_id = request.user.departement_id

        depts = validated_data.pop('departements', None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()

        if depts is not None:
            # Un chef ne peut PAS retirer son propre département.
            if not any(d.pk == dept_id for d in depts):
                raise PermissionDenied(
                    "Vous ne pouvez pas retirer votre propre département "
                    "de cet enseignant."
                )
            instance.departements.set(depts)
        return instance


class MesEnseignantsViewSet(viewsets.ModelViewSet):
    """CRUD des enseignants de mon département (chef uniquement)."""

    # Cf. MesUEsViewSet — queryset par défaut pour drf-spectacular.
    queryset           = Enseignant.objects.none()
    serializer_class   = MesEnseignantsSerializer
    permission_classes = [IsChefDept, ScopedToOwnDept]
    search_fields      = ['nom']
    filterset_fields   = ['grade']
    ordering_fields    = ['nom', 'grade']
    ordering           = ['nom']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Enseignant.objects.none()
        dept_id = self.request.user.departement_id
        return (
            Enseignant.objects
            .prefetch_related('departements')
            .filter(departements__id=dept_id)
            .distinct()
        )


# ─── Filières du chef (lecture seule) ────────────────────────────────────────
class MesFilieresViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Filières du département du chef — lecture seule.

    Sert à peupler le sélecteur de filière dans le formulaire de création
    d'UE côté chef (le référentiel /filieres/ étant réservé à la DAR).
    """

    queryset           = Filiere.objects.none()
    serializer_class   = FiliereSerializer
    permission_classes = [IsChefDept, ScopedToOwnDept]
    filterset_fields   = ['niveau', 'ville']
    ordering_fields    = ['code', 'niveau', 'ville']
    ordering           = ['code', 'niveau']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Filiere.objects.none()
        dept_id = self.request.user.departement_id
        return (
            Filiere.objects
            .select_related('departement')
            .filter(departement_id=dept_id)
        )


# ─── Indisponibilités des enseignants du chef ────────────────────────────────
class MesIndisponibilitesViewSet(viewsets.ModelViewSet):
    """
    CRUD des indisponibilités des enseignants de mon département (chef).

    L'UI démarre par le PONCTUEL (absence sur une semaine précise) ; le
    modèle accepte aussi le récurrent.
    """

    queryset           = IndisponibiliteEnseignant.objects.none()
    serializer_class   = IndisponibiliteSerializer
    permission_classes = [IsChefDept, ScopedToOwnDept]
    filterset_fields   = ['enseignant', 'semaine', 'type']
    ordering           = ['-cree_le']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return IndisponibiliteEnseignant.objects.none()
        dept_id = self.request.user.departement_id
        return (
            IndisponibiliteEnseignant.objects
            .filter(enseignant__departements__id=dept_id)
            .select_related('enseignant', 'semaine')
            .distinct()
        )

    def perform_create(self, serializer):
        dept_id = self.request.user.departement_id
        ens     = serializer.validated_data.get('enseignant')
        if not ens or not ens.departements.filter(id=dept_id).exists():
            raise ValidationError({'enseignant': "Cet enseignant n'appartient pas à votre département."})

        typ = serializer.validated_data.get('type') or IndisponibiliteEnseignant.Type.PONCTUELLE
        if typ == IndisponibiliteEnseignant.Type.PONCTUELLE and not serializer.validated_data.get('semaine'):
            raise ValidationError({'semaine': "Précisez la semaine de l'absence ponctuelle."})

        indispo = serializer.save(cree_par=self.request.user, type=typ)
        self._notifier_dar_si_impact(indispo)

    @staticmethod
    def _notifier_dar_si_impact(indispo):
        """
        Si l'absence touche une semaine DÉJÀ générée/publiée et impacte des
        séances existantes, on prévient le DAR (qui seul peut corriger le
        planning). Sinon, rien : la dispo sera simplement respectée à la
        prochaine génération.
        """
        semaine = indispo.semaine
        if not semaine or semaine.statut not in (StatutSemaine.GENERE, StatutSemaine.PUBLIE):
            return

        qs = Seance.objects.filter(
            semaine=semaine, enseignant=indispo.enseignant, jour=indispo.jour,
        )
        if indispo.creneau is not None:
            qs = qs.filter(creneau=indispo.creneau)
        n = qs.count()
        if n == 0:
            return

        ens     = indispo.enseignant
        dept    = getattr(indispo.cree_par, 'departement', None)
        creneau = Creneau(indispo.creneau).label if indispo.creneau is not None else 'toute la journée'
        notifier_dar(
            TypeNotification.ABSENCE_SIGNALEE,
            titre=f"Absence signalée — {ens.nom}",
            message=(
                f"{ens.nom} sera absent {Jour(indispo.jour).label} ({creneau}) — "
                f"{n} séance(s) à replacer"
                + (f" (dépt {dept.nom})" if dept else "")
                + f". Semaine {semaine}."
            ),
            lien=f'/dar/semaines/{semaine.id}/planning',
            semaine=semaine,
        )
