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
from rest_framework.exceptions import PermissionDenied

from core.models import Enseignant, UE
from core.permissions import IsChefDept, ScopedToOwnDept
from core.serializers import EnseignantSerializer, UESerializer


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
