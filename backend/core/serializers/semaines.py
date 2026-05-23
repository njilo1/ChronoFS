"""
Serializers pour les Semaines (Couche 2 — données hebdomadaires).

Phase 2 : CRUD simple. Les actions métier (clôturer imports, générer,
exporter) seront ajoutées en Phases 4 et 5.
"""

from rest_framework import serializers

from core.models import Semaine


class SemaineSerializer(serializers.ModelSerializer):
    statut_display          = serializers.CharField(source='get_statut_display',   read_only=True)
    semestre_display        = serializers.CharField(source='get_semestre_display', read_only=True)
    annee_academique_libelle = serializers.CharField(source='annee_academique.libelle', read_only=True)
    nb_imports   = serializers.IntegerField(source='imports.count',  read_only=True)
    nb_seances   = serializers.IntegerField(source='seances.count',  read_only=True)
    nb_archives  = serializers.IntegerField(source='archives.count', read_only=True)

    class Meta:
        model  = Semaine
        fields = (
            'id',
            'annee_academique', 'annee_academique_libelle',
            'date_debut', 'date_fin',
            'semestre', 'semestre_display',
            'statut',   'statut_display',
            'numero_reference',
            'nb_imports', 'nb_seances', 'nb_archives',
        )

    def validate(self, data):
        debut = data.get('date_debut', getattr(self.instance, 'date_debut', None))
        fin   = data.get('date_fin',   getattr(self.instance, 'date_fin',   None))
        if debut and fin and fin < debut:
            raise serializers.ValidationError(
                {'date_fin': "La date de fin doit être postérieure à la date de début."}
            )
        return data
