from rest_framework import serializers
from .models import SessionPlanification, ImportDepartement


class ImportDepartementSerializer(serializers.ModelSerializer):
    """Ligne de suivi d'import pour un département dans une session."""

    departement_code = serializers.CharField(source='departement.code', read_only=True)
    departement_nom  = serializers.CharField(source='departement.nom',  read_only=True)
    importe          = serializers.BooleanField(read_only=True)

    class Meta:
        model  = ImportDepartement
        fields = [
            'id', 'session', 'departement',
            'departement_code', 'departement_nom',
            'date_import', 'fichier_nom', 'nb_matieres', 'nb_erreurs',
            'importe',
        ]
        read_only_fields = ['date_import', 'fichier_nom', 'nb_matieres', 'nb_erreurs']


class SessionPlanificationSerializer(serializers.ModelSerializer):
    """Session de planification avec compteurs résumés."""

    nb_imports_total   = serializers.SerializerMethodField()
    nb_imports_faits   = serializers.SerializerMethodField()
    tous_importes      = serializers.SerializerMethodField()
    nb_emplois_du_temps = serializers.IntegerField(source='emplois_du_temps.count', read_only=True)
    nb_matieres        = serializers.IntegerField(source='matieres.count', read_only=True)

    def get_nb_imports_total(self, obj):
        return obj.imports.count()

    def get_nb_imports_faits(self, obj):
        return obj.imports.filter(date_import__isnull=False).count()

    def get_tous_importes(self, obj):
        total = obj.imports.count()
        faits = obj.imports.filter(date_import__isnull=False).count()
        return total > 0 and faits == total

    class Meta:
        model  = SessionPlanification
        fields = [
            'id', 'libelle',
            'semaine_debut', 'semaine_fin', 'semestre', 'annee_academique',
            'etat',
            'cree_le', 'genere_le', 'publie_le',
            'nb_imports_total', 'nb_imports_faits', 'tous_importes',
            'nb_emplois_du_temps', 'nb_matieres',
        ]
        read_only_fields = ['cree_le', 'genere_le', 'publie_le', 'etat']
