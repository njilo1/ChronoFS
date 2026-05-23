from rest_framework import serializers
from .models import Campus, Salle


class CampusSerializer(serializers.ModelSerializer):
    """CRUD pour les campus (Ebolowa Principal, Lycée, CRA, Monatélé, etc.)"""

    nb_salles = serializers.IntegerField(source='salles.count', read_only=True)

    class Meta:
        model  = Campus
        fields = ['id', 'nom', 'code', 'ville', 'adresse', 'est_principal', 'nb_salles']


class SalleSerializer(serializers.ModelSerializer):
    """Sérialise une salle avec le nom du campus en lecture."""

    campus_nom  = serializers.CharField(source='campus.nom',  read_only=True)
    campus_ville = serializers.CharField(source='campus.ville', read_only=True)

    class Meta:
        model  = Salle
        fields = ['id', 'nom', 'capacite', 'campus', 'campus_nom', 'campus_ville', 'est_disponible']
