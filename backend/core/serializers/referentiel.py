"""
Serializers du référentiel stable (Couche 1).

Pattern adopté :
- Lecture : les relations (campus, departement, filiere) sont sérialisées comme
  des objets imbriqués pour épargner au frontend un appel supplémentaire.
- Écriture : on accepte l'ID comme avant (compat). Les ModelSerializer DRF
  gèrent ça automatiquement quand `to_representation` est surchargé sans
  toucher au champ FK.
"""

import re

from rest_framework import serializers

from core.constants import StatutEnseignant
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
    campus_nom         = serializers.CharField(source='campus.nom',           read_only=True)
    campus_ville       = serializers.CharField(source='campus.ville',         read_only=True)
    type_salle_display = serializers.CharField(source='get_type_salle_display', read_only=True)

    class Meta:
        model  = Salle
        fields = (
            'id', 'nom', 'campus', 'campus_nom', 'campus_ville',
            'capacite', 'type_salle', 'type_salle_display', 'disponible',
        )

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # Lecture : remplace l'ID `campus` par un objet imbriqué pour que le
        # frontend puisse faire `r.campus.nom` sans appel supplémentaire.
        if instance.campus_id:
            rep['campus'] = {
                'id':    instance.campus.id,
                'nom':   instance.campus.nom,
                'ville': instance.campus.ville,
                'ville_display': instance.campus.get_ville_display(),
            }
        return rep


# ── Departement / Filiere ────────────────────────────────────────────────────
class DepartementSerializer(serializers.ModelSerializer):
    nb_filieres    = serializers.IntegerField(source='filieres.count',    read_only=True)
    nb_enseignants = serializers.IntegerField(source='enseignants.count', read_only=True)
    chef_nom       = serializers.ReadOnlyField()           # « Grade NOM » ou ''
    chef_id        = serializers.SerializerMethodField()

    class Meta:
        model  = Departement
        fields = ('id', 'code', 'nom', 'chef_id', 'chef_nom',
                  'nb_filieres', 'nb_enseignants')

    def get_chef_id(self, obj) -> int | None:
        chef = obj.chef
        return chef.id if chef else None


class FiliereSerializer(serializers.ModelSerializer):
    departement_code = serializers.CharField(source='departement.code',     read_only=True)
    departement_nom  = serializers.CharField(source='departement.nom',      read_only=True)
    niveau_display   = serializers.CharField(source='get_niveau_display',   read_only=True)
    ville_display    = serializers.CharField(source='get_ville_display',    read_only=True)
    campus_obligatoire_nom = serializers.CharField(
        source='campus_obligatoire.nom', read_only=True, default=None,
    )

    class Meta:
        model  = Filiere
        fields = (
            'id', 'code', 'niveau', 'niveau_display',
            'nom', 'departement', 'departement_code', 'departement_nom',
            'ville', 'ville_display', 'effectif',
            'campus_obligatoire', 'campus_obligatoire_nom',
        )

    def validate(self, attrs):
        # Le campus imposé doit appartenir à la même ville que la filière,
        # sinon il contredirait la contrainte de ville (H7) et rendrait toute
        # génération impossible pour cette filière.
        campus = attrs.get('campus_obligatoire',
                           getattr(self.instance, 'campus_obligatoire', None))
        ville  = attrs.get('ville', getattr(self.instance, 'ville', None))
        if campus is not None and ville is not None and campus.ville != ville:
            raise serializers.ValidationError({'campus_obligatoire':
                f"Le campus « {campus.nom} » est à {campus.get_ville_display()}, "
                f"mais la filière est déclarée à {dict(self.fields['ville'].choices).get(ville, ville)}. "
                "Le campus imposé doit être dans la même ville que la filière."
            })
        return attrs

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if instance.departement_id:
            rep['departement'] = {
                'id':   instance.departement.id,
                'code': instance.departement.code,
                'nom':  instance.departement.nom,
            }
        if instance.campus_obligatoire_id:
            rep['campus_obligatoire'] = {
                'id':    instance.campus_obligatoire.id,
                'nom':   instance.campus_obligatoire.nom,
                'ville': instance.campus_obligatoire.ville,
            }
        return rep


# ── Enseignant ───────────────────────────────────────────────────────────────
class EnseignantSerializer(serializers.ModelSerializer):
    grade_display      = serializers.CharField(source='get_grade_display',  read_only=True)
    statut_display     = serializers.CharField(source='get_statut_display', read_only=True)
    departements_codes = serializers.SerializerMethodField()
    nom_complet        = serializers.SerializerMethodField()
    identifiant        = serializers.ReadOnlyField()  # matricule OU réf. interne VAC-xxxx

    class Meta:
        model  = Enseignant
        fields = (
            'id', 'nom', 'grade', 'grade_display', 'nom_complet',
            'matricule', 'identifiant',
            'statut', 'statut_display',
            'departements', 'departements_codes', 'actif',
        )

    def get_departements_codes(self, obj) -> list[str]:
        return [d.code for d in obj.departements.all()]

    def get_nom_complet(self, obj) -> str:
        return f'{obj.get_grade_display()} {obj.nom}'

    def validate(self, attrs):
        """Règle métier matricule ↔ statut.

        - Permanent : matricule OBLIGATOIRE et au format 7 chiffres + 1 lettre.
        - Vacataire : pas de matricule (champ laissé vide → identifiant VAC-xxxx).
        """
        statut    = attrs.get('statut',    getattr(self.instance, 'statut', None))
        matricule = attrs.get('matricule', getattr(self.instance, 'matricule', None))
        matricule = (matricule or '').strip() or None

        if statut == StatutEnseignant.PERMANENT:
            if not matricule:
                raise serializers.ValidationError(
                    {'matricule': "Le matricule est obligatoire pour un enseignant permanent."})
            if not re.match(r'^\d{7}[A-Za-z]$', matricule):
                raise serializers.ValidationError(
                    {'matricule': "Format attendu : 7 chiffres suivis d'une lettre (ex. 0777888A)."})
        elif statut == StatutEnseignant.VACATAIRE and matricule:
            raise serializers.ValidationError(
                {'matricule': "Un vacataire ne possède pas de matricule officiel ; laissez ce champ vide."})

        attrs['matricule'] = matricule
        return attrs

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        # Lecture : liste d'objets imbriqués pour départements (au lieu d'IDs).
        rep['departements'] = [
            {'id': d.id, 'code': d.code, 'nom': d.nom}
            for d in instance.departements.all()
        ]
        return rep


# ── UE ───────────────────────────────────────────────────────────────────────
class UESerializer(serializers.ModelSerializer):
    filiere_code   = serializers.CharField(source='filiere.code',   read_only=True)
    filiere_niveau = serializers.CharField(source='filiere.niveau', read_only=True)
    filiere_ville  = serializers.CharField(source='filiere.ville',  read_only=True)

    class Meta:
        model  = UE
        fields = (
            'id', 'code', 'intitule', 'credits',
            'filiere', 'filiere_code', 'filiere_niveau', 'filiere_ville',
        )

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if instance.filiere_id:
            rep['filiere'] = {
                'id':     instance.filiere.id,
                'code':   instance.filiere.code,
                'nom':    instance.filiere.nom,
                'niveau': instance.filiere.niveau,
                'ville':  instance.filiere.ville,
            }
        return rep


# ── Année académique ─────────────────────────────────────────────────────────
class AnneeAcademiqueSerializer(serializers.ModelSerializer):
    class Meta:
        model  = AnneeAcademique
        fields = ('id', 'libelle', 'date_debut', 'date_fin', 'active')
