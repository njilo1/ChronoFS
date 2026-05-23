"""
Serializers du référentiel stable (Couche 1).

Pattern adopté :
- Champs de relation en `PrimaryKeyRelatedField` pour l'écriture (id).
- Champs `*_display` / `*_code` / `*_nom` en lecture seule pour épargner
  au frontend les jointures supplémentaires.
"""

from rest_framework import serializers

from core.models import (
    AnneeAcademique,
    Campus,
    Departement,
    Enseignant,
    Filiere,
    Salle,
    UE,
)


# ── Campus / Salle ───────────────────────────────────────────────────────────
class CampusSerializer(serializers.ModelSerializer):
    ville_display = serializers.CharField(source='get_ville_display', read_only=True)
    nb_salles     = serializers.IntegerField(source='salles.count',   read_only=True)

    class Meta:
        model  = Campus
        fields = ('id', 'nom', 'ville', 'ville_display', 'nb_salles')


class SalleSerializer(serializers.ModelSerializer):
    campus_nom        = serializers.CharField(source='campus.nom',          read_only=True)
    campus_ville      = serializers.CharField(source='campus.ville',        read_only=True)
    type_salle_display = serializers.CharField(source='get_type_salle_display', read_only=True)

    class Meta:
        model  = Salle
        fields = (
            'id', 'nom', 'campus', 'campus_nom', 'campus_ville',
            'capacite', 'type_salle', 'type_salle_display', 'disponible',
        )


# ── Departement / Filiere ────────────────────────────────────────────────────
class DepartementSerializer(serializers.ModelSerializer):
    nb_filieres   = serializers.IntegerField(source='filieres.count',   read_only=True)
    nb_enseignants = serializers.IntegerField(source='enseignants.count', read_only=True)

    class Meta:
        model  = Departement
        fields = ('id', 'code', 'nom', 'nb_filieres', 'nb_enseignants')


class FiliereSerializer(serializers.ModelSerializer):
    departement_code = serializers.CharField(source='departement.code',     read_only=True)
    departement_nom  = serializers.CharField(source='departement.nom',      read_only=True)
    niveau_display   = serializers.CharField(source='get_niveau_display',   read_only=True)
    ville_display    = serializers.CharField(source='get_ville_display',    read_only=True)

    class Meta:
        model  = Filiere
        fields = (
            'id', 'code', 'niveau', 'niveau_display',
            'nom', 'departement', 'departement_code', 'departement_nom',
            'ville', 'ville_display', 'effectif',
        )


# ── Enseignant ───────────────────────────────────────────────────────────────
class EnseignantSerializer(serializers.ModelSerializer):
    grade_display      = serializers.CharField(source='get_grade_display', read_only=True)
    departements_codes = serializers.SerializerMethodField()
    nom_complet        = serializers.SerializerMethodField()

    class Meta:
        model  = Enseignant
        fields = (
            'id', 'nom', 'grade', 'grade_display', 'nom_complet',
            'departements', 'departements_codes',
        )

    def get_departements_codes(self, obj) -> list[str]:
        return [d.code for d in obj.departements.all()]

    def get_nom_complet(self, obj) -> str:
        return f'{obj.get_grade_display()} {obj.nom}'


# ── UE ───────────────────────────────────────────────────────────────────────
class UESerializer(serializers.ModelSerializer):
    filiere_code   = serializers.CharField(source='filiere.code',   read_only=True)
    filiere_niveau = serializers.CharField(source='filiere.niveau', read_only=True)
    filiere_ville  = serializers.CharField(source='filiere.ville',  read_only=True)

    class Meta:
        model  = UE
        fields = (
            'id', 'code', 'intitule',
            'filiere', 'filiere_code', 'filiere_niveau', 'filiere_ville',
        )


# ── Année académique ─────────────────────────────────────────────────────────
class AnneeAcademiqueSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AnneeAcademique
        fields = ('id', 'libelle', 'date_debut', 'date_fin', 'active')
