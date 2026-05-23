from rest_framework import serializers
from .models import Departement, Filiere, Niveau


class DepartementSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Departement
        fields = '__all__'


class NiveauSerializer(serializers.ModelSerializer):
    filiere_code = serializers.CharField(source='filiere.code', read_only=True)
    filiere_nom  = serializers.CharField(source='filiere.nom',  read_only=True)

    class Meta:
        model  = Niveau
        fields = ['id', 'nom', 'effectif', 'filiere', 'filiere_code', 'filiere_nom']


class FiliereSerializer(serializers.ModelSerializer):
    niveaux         = NiveauSerializer(many=True, read_only=True)
    departement_nom = serializers.CharField(source='departement.nom',   read_only=True)
    campus_nom      = serializers.CharField(source='campus.nom',        read_only=True)
    campus_ville    = serializers.CharField(source='campus.ville',      read_only=True)

    class Meta:
        model  = Filiere
        fields = [
            'id', 'nom', 'code', 'effectif',
            'departement',      # id (écriture)
            'departement_nom',  # lecture
            'campus',           # id (écriture)
            'campus_nom',       # lecture
            'campus_ville',     # lecture
            'niveaux',
        ]
