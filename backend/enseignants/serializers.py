from rest_framework import serializers
from .models import Enseignant
from filieres.serializers import DepartementSerializer


class EnseignantSerializer(serializers.ModelSerializer):
    """
    Sérialise un enseignant avec ses départements.
    En lecture : on voit la liste complète des départements.
    En écriture : on envoie une liste d'ids de départements.
    """

    # En lecture : affiche les détails complets des départements
    # Ex: [{"id": 1, "nom": "Informatique", "code": "TIC"}, ...]
    departements_detail = DepartementSerializer(
        source='departements',  # le champ ManyToMany du modèle
        many=True,
        read_only=True
    )

    # Champ calculé : affiche "Dr. TCHAMBA Ferdinand"
    nom_complet = serializers.SerializerMethodField()

    def get_nom_complet(self, obj):
        # obj = l'instance Enseignant courante
        return f"{obj.get_grade_display()}. {obj.nom} {obj.prenom}"

    class Meta:
        model  = Enseignant
        fields = [
            'id', 'nom', 'prenom', 'grade', 'email', 'specialite', 'est_actif',
            'departements',         # liste d'ids (pour écriture)
            'departements_detail',  # liste complète (pour lecture)
            'nom_complet',          # champ calculé
        ]
