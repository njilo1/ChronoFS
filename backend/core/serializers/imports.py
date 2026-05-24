"""
Serializers pour le workflow d'import des plannings hebdomadaires.

Trois niveaux de représentation :
- ImportPlanningSerializer       : lecture (mine, list DAR, retrieve)
- ImportPlanningHistoriqueSerializer : versions archivées
- DemandeCoursSerializer        : lignes valides issues du parsing
"""

from rest_framework import serializers

from core.models import (
    DemandeCours,
    ImportPlanning,
    ImportPlanningHistorique,
)


class DemandeCoursSerializer(serializers.ModelSerializer):
    filiere_libelle   = serializers.SerializerMethodField()
    ue_code           = serializers.CharField(source='ue.code',       read_only=True)
    ue_intitule       = serializers.CharField(source='ue.intitule',   read_only=True)
    enseignant_nom    = serializers.SerializerMethodField()
    jour_display      = serializers.CharField(source='get_jour_display',       read_only=True)
    creneau_display   = serializers.CharField(source='get_creneau_display',    read_only=True)
    type_cours_display = serializers.CharField(source='get_type_cours_display', read_only=True)

    class Meta:
        model  = DemandeCours
        fields = (
            'id',
            'filiere', 'filiere_libelle',
            'ue', 'ue_code', 'ue_intitule',
            'enseignant', 'enseignant_nom',
            'effectif_declare',
            'jour', 'jour_display',
            'creneau', 'creneau_display',
            'type_cours', 'type_cours_display',
            'observations',
        )
        read_only_fields = fields  # création via service uniquement

    def get_filiere_libelle(self, obj) -> str:
        f = obj.filiere
        return f'{f.code} {f.niveau} ({f.get_ville_display()})'

    def get_enseignant_nom(self, obj) -> str:
        if obj.enseignant_id is None:
            return 'Non assigné'
        return f'{obj.enseignant.get_grade_display()} {obj.enseignant.nom}'


class ImportPlanningSerializer(serializers.ModelSerializer):
    """Représentation d'un import actif pour les listes et le détail."""

    departement_code   = serializers.CharField(source='departement.code', read_only=True)
    departement_nom    = serializers.CharField(source='departement.nom',  read_only=True)
    semaine_libelle    = serializers.SerializerMethodField()
    uploaded_by_nom    = serializers.SerializerMethodField()
    statut_display     = serializers.CharField(source='get_statut_parsing_display', read_only=True)
    nb_demandes        = serializers.IntegerField(source='demandes.count', read_only=True)
    fichier_url        = serializers.SerializerMethodField()

    class Meta:
        model  = ImportPlanning
        fields = (
            'id',
            'semaine', 'semaine_libelle',
            'departement', 'departement_code', 'departement_nom',
            'uploaded_by', 'uploaded_by_nom', 'uploaded_at',
            'statut_parsing', 'statut_display',
            'rapport_parsing',
            'nb_demandes',
            'fichier', 'fichier_url',
        )
        read_only_fields = fields

    def get_semaine_libelle(self, obj) -> str:
        s = obj.semaine
        return f'Semaine du {s.date_debut:%d/%m/%Y} au {s.date_fin:%d/%m/%Y}'

    def get_uploaded_by_nom(self, obj) -> str:
        u = obj.uploaded_by
        if not u:
            return '—'
        nom_complet = f'{u.get_grade_display()} {u.last_name}'.strip() if u.grade else u.username
        return nom_complet or u.username

    def get_fichier_url(self, obj) -> str:
        if not obj.fichier:
            return ''
        request = self.context.get('request')
        return request.build_absolute_uri(obj.fichier.url) if request else obj.fichier.url


class ImportPlanningHistoriqueSerializer(serializers.ModelSerializer):
    """Version archivée d'un envoi remplacé."""

    departement_code = serializers.CharField(source='departement.code', read_only=True)
    uploaded_by_nom  = serializers.SerializerMethodField()
    fichier_url      = serializers.SerializerMethodField()

    class Meta:
        model  = ImportPlanningHistorique
        fields = (
            'id', 'semaine', 'departement', 'departement_code',
            'uploaded_by', 'uploaded_by_nom',
            'uploaded_at', 'remplace_le', 'version',
            'fichier', 'fichier_url',
        )
        read_only_fields = fields

    def get_uploaded_by_nom(self, obj) -> str:
        return obj.uploaded_by.username if obj.uploaded_by else '—'

    def get_fichier_url(self, obj) -> str:
        if not obj.fichier:
            return ''
        request = self.context.get('request')
        return request.build_absolute_uri(obj.fichier.url) if request else obj.fichier.url


class UploadImportSerializer(serializers.Serializer):
    """Body d'upload : multipart `fichier` + `semaine` (id)."""

    fichier = serializers.FileField()
    semaine = serializers.IntegerField(help_text="ID de la semaine cible (statut IMPORTS_OUVERTS).")
