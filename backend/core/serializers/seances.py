"""
Serializers pour les Seance — sortie du solver + édition manuelle DAR.

Deux flavors :
- SeanceSerializer       : lecture (grille planning, exports)
- SeanceEditSerializer   : PATCH par le DAR (déplacement / changement
                           de salle / changement d'enseignant) avec
                           audit `modifie_par`/`modifie_le`/`modifie_manuellement`.
"""

from django.utils import timezone
from rest_framework import serializers

from core.models import Seance


class SeanceSerializer(serializers.ModelSerializer):
    """Représentation pour l'affichage (grille DAR, consultation chef)."""

    filiere_libelle    = serializers.SerializerMethodField()
    ue_code            = serializers.CharField(source='ue.code',                read_only=True)
    ue_intitule        = serializers.CharField(source='ue.intitule',            read_only=True)
    enseignant_nom     = serializers.SerializerMethodField()
    salle_nom          = serializers.CharField(source='salle.nom',              read_only=True)
    salle_campus       = serializers.CharField(source='salle.campus.nom',       read_only=True)
    salle_ville        = serializers.CharField(source='salle.campus.ville',     read_only=True)
    jour_display       = serializers.CharField(source='get_jour_display',       read_only=True)
    creneau_display    = serializers.CharField(source='get_creneau_display',    read_only=True)
    type_cours_display = serializers.CharField(source='get_type_cours_display', read_only=True)

    class Meta:
        model  = Seance
        fields = (
            'id', 'semaine',
            'filiere', 'filiere_libelle',
            'ue', 'ue_code', 'ue_intitule',
            'enseignant', 'enseignant_nom',
            'salle', 'salle_nom', 'salle_campus', 'salle_ville',
            'jour', 'jour_display',
            'creneau', 'creneau_display',
            'type_cours', 'type_cours_display',
            'modifie_manuellement', 'modifie_le', 'modifie_par',
        )
        read_only_fields = fields  # lecture seule via cet endpoint

    def get_filiere_libelle(self, obj) -> str:
        f = obj.filiere
        return f'{f.code} {f.niveau} ({f.get_ville_display()})'

    def get_enseignant_nom(self, obj) -> str:
        if obj.enseignant_id is None:
            return 'Non assigné'
        return f'{obj.enseignant.get_grade_display()} {obj.enseignant.nom}'


class SeanceEditSerializer(serializers.ModelSerializer):
    """
    PATCH par le DAR pour modifier manuellement une séance après
    génération automatique. Audit obligatoire.
    """

    class Meta:
        model  = Seance
        fields = ('salle', 'enseignant', 'jour', 'creneau', 'type_cours')

    def update(self, instance, validated_data):
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.modifie_manuellement = True
        instance.modifie_le           = timezone.now()
        instance.modifie_par          = self.context['request'].user
        instance.save()
        return instance
