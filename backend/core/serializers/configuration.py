"""
Serializers de la configuration du solver (super-admin).

- `RegleSolverSerializer`     : CRUD des contraintes. Les entrées verrouillées
                               (les 9 dures historiques) ne peuvent être ni
                               supprimées ni dénaturées : seuls `description`,
                               `active_par_defaut` et `ordre` restent modifiables.
                               Les règles dynamiques sont paramétrées via un
                               template validé (aucun code exécutable).
- `FonctionObjectifSerializer`: CRUD des objectifs (mêmes garde-fous).
- `JournalGenerationSerializer`: lecture seule de l'audit des générations.
"""

from django.utils.text import slugify
from rest_framework import serializers

from core.constants import CategorieRegle, TypeRegle
from core.models import FonctionObjectif, JournalGeneration, RegleSolver
from core.scheduling.registre import REGISTRE_TEMPLATES, valider_parametres


def _code_unique(modele, base: str) -> str:
    """Génère un code slug unique pour une entrée dynamique."""
    racine = 'R_' + (slugify(base).replace('-', '_').upper() or 'REGLE')
    code = racine
    i = 2
    while modele.objects.filter(code=code).exists():
        code = f'{racine}_{i}'
        i += 1
    return code


class RegleSolverSerializer(serializers.ModelSerializer):
    """Lecture / écriture d'une règle du solver."""

    type_regle_display = serializers.CharField(source='get_type_regle_display', read_only=True)
    categorie_display  = serializers.CharField(source='get_categorie_display',  read_only=True)

    class Meta:
        model  = RegleSolver
        fields = (
            'id', 'code', 'nom', 'description',
            'type_regle', 'type_regle_display',
            'categorie', 'categorie_display',
            'verrouillee', 'active_par_defaut',
            'template', 'parametres', 'ordre',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'code', 'verrouillee', 'created_at', 'updated_at')

    def validate(self, attrs):
        template = attrs.get('template', getattr(self.instance, 'template', None))
        # Verrouillée : structure figée — on n'autorise que description / ordre /
        # active_par_defaut (les autres champs sont ignorés silencieusement).
        if self.instance and self.instance.verrouillee:
            autorises = {'description', 'active_par_defaut', 'ordre'}
            for champ in list(attrs.keys()):
                if champ not in autorises:
                    attrs.pop(champ)
            return attrs

        # Règle dynamique : un template valide + paramètres conformes au schéma.
        if template:
            try:
                attrs['parametres'] = valider_parametres(template, attrs.get(
                    'parametres', getattr(self.instance, 'parametres', {}),
                ))
            except ValueError as e:
                raise serializers.ValidationError({'parametres': str(e)})
        return attrs

    def create(self, validated_data):
        template = validated_data.get('template')
        if not template or template not in REGISTRE_TEMPLATES:
            raise serializers.ValidationError(
                {'template': "Une règle dynamique doit référencer un template valide."}
            )
        # Une règle créée via l'API est TOUJOURS dynamique et non verrouillée.
        validated_data['categorie']   = CategorieRegle.DYNAMIQUE
        validated_data['verrouillee'] = False
        validated_data.setdefault('type_regle', REGISTRE_TEMPLATES[template].get('type_regle', TypeRegle.DURE))
        validated_data['code'] = _code_unique(RegleSolver, validated_data.get('nom', template))
        return super().create(validated_data)


class FonctionObjectifSerializer(serializers.ModelSerializer):
    """Lecture / écriture d'une fonction objectif."""

    sens_display = serializers.CharField(source='get_sens_display', read_only=True)

    class Meta:
        model  = FonctionObjectif
        fields = (
            'id', 'code', 'nom', 'description',
            'sens', 'sens_display', 'priorite',
            'verrouillee', 'active_par_defaut',
            'template', 'parametres', 'ordre',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'code', 'verrouillee', 'created_at', 'updated_at')

    def validate(self, attrs):
        # Verrouillé : on n'autorise que la priorité, l'ordre, la description et
        # l'activation par défaut (réordonnancement et libellé restent permis).
        if self.instance and self.instance.verrouillee:
            autorises = {'priorite', 'ordre', 'description', 'active_par_defaut'}
            for champ in list(attrs.keys()):
                if champ not in autorises:
                    attrs.pop(champ)
        return attrs

    def create(self, validated_data):
        validated_data['verrouillee'] = False
        validated_data['code'] = _code_unique(FonctionObjectif, validated_data.get('nom', 'objectif'))
        return super().create(validated_data)


class JournalGenerationSerializer(serializers.ModelSerializer):
    """Lecture seule de l'historique des générations."""

    semaine_libelle = serializers.SerializerMethodField()
    lancee_par_nom  = serializers.CharField(source='lancee_par.username', read_only=True, default=None)

    class Meta:
        model  = JournalGeneration
        fields = (
            'id', 'semaine', 'semaine_libelle',
            'lancee_par', 'lancee_par_nom', 'lancee_le',
            'regles_appliquees', 'objectifs_appliques',
            'nb_demandes', 'nb_placees', 'nb_non_placees',
            'taux', 'duree_ms', 'statut_solver',
        )
        read_only_fields = fields

    def get_semaine_libelle(self, obj):
        s = obj.semaine
        return f'{s.date_debut:%d/%m/%Y} → {s.date_fin:%d/%m/%Y}' if s else '—'
