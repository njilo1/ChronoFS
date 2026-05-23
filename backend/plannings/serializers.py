from rest_framework import serializers
from .models import EmploiDuTemps, Creneau, CreneauExamen


class CreneauSerializer(serializers.ModelSerializer):
    """Créneau de cours avec toutes les infos pour afficher la grille EDT."""

    matiere_code     = serializers.CharField(source='matiere.code',                  read_only=True)
    matiere_intitule = serializers.CharField(source='matiere.intitule',              read_only=True)
    niveau_nom       = serializers.CharField(source='matiere.niveau.nom',            read_only=True)
    filiere_code     = serializers.CharField(source='matiere.niveau.filiere.code',   read_only=True)
    salle_nom        = serializers.CharField(source='salle.nom',                     read_only=True)
    salle_capacite   = serializers.IntegerField(source='salle.capacite',             read_only=True)
    enseignant_nom   = serializers.SerializerMethodField()

    def get_enseignant_nom(self, obj):
        ens = obj.matiere.enseignant
        return f"{ens.grade}. {ens.nom} {ens.prenom}" if ens else None

    class Meta:
        model  = Creneau
        fields = [
            'id', 'jour', 'heure_debut', 'heure_fin', 'genere_auto',
            'emploi_du_temps', 'matiere', 'salle',
            'matiere_code', 'matiere_intitule', 'enseignant_nom',
            'salle_nom', 'salle_capacite', 'niveau_nom', 'filiere_code',
        ]


class CreneauExamenSerializer(serializers.ModelSerializer):
    """
    Créneau d'examen ou de rattrapage.
    Inclut les noms des surveillants pour l'affichage direct.
    """

    salle_nom      = serializers.CharField(source='salle.nom',                      read_only=True)
    filiere_code   = serializers.CharField(source='filiere.code',                   read_only=True)
    filiere_nom    = serializers.CharField(source='filiere.nom',                    read_only=True)
    niveau_nom     = serializers.CharField(source='niveau.nom',                     read_only=True)
    chef_salle_nom = serializers.SerializerMethodField()
    surveillants_noms = serializers.SerializerMethodField()

    def get_chef_salle_nom(self, obj):
        if obj.chef_salle:
            return f"{obj.chef_salle.grade}. {obj.chef_salle.nom} {obj.chef_salle.prenom}"
        return None

    def get_surveillants_noms(self, obj):
        return [
            f"{e.grade}. {e.nom} {e.prenom}"
            for e in obj.surveillants.all()
        ]

    class Meta:
        model  = CreneauExamen
        fields = [
            'id', 'emploi_du_temps',
            'jour', 'heure_debut', 'heure_fin',
            'code_matiere', 'intitule', 'matiere',
            'filiere', 'filiere_code', 'filiere_nom',
            'niveau', 'niveau_nom',
            'salle', 'salle_nom',
            'surveillants', 'surveillants_noms',
            'chef_salle', 'chef_salle_nom',
        ]


class EmploiDuTempsSerializer(serializers.ModelSerializer):
    """Emploi du temps avec compteurs de créneaux et infos campus."""

    nb_creneaux       = serializers.IntegerField(source='creneaux.count',       read_only=True)
    nb_creneaux_examen = serializers.IntegerField(source='creneaux_examen.count', read_only=True)
    campus_nom        = serializers.CharField(source='campus.nom',              read_only=True)
    campus_ville      = serializers.CharField(source='campus.ville',            read_only=True)

    class Meta:
        model  = EmploiDuTemps
        fields = [
            'id', 'type_planning', 'semaine_debut', 'semaine_fin',
            'semestre', 'annee_academique', 'est_publie', 'cree_le',
            'campus', 'campus_nom', 'campus_ville',
            'nb_creneaux', 'nb_creneaux_examen',
        ]
