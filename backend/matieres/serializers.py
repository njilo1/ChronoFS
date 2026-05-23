from rest_framework import serializers
from .models import Matiere


class MatiereSerializer(serializers.ModelSerializer):
    """
    Sérialise une matière avec des infos lisibles sur le niveau et l'enseignant.
    Ça évite au frontend de faire des requêtes supplémentaires juste pour
    afficher "TIC L2 — Dr. Nyabeye" à côté du code "TIC224".
    """

    # Infos du niveau : filière + nom (ex: TIC L2)
    niveau_nom     = serializers.CharField(source='niveau.nom',          read_only=True)
    filiere_code   = serializers.CharField(source='niveau.filiere.code', read_only=True)

    # Infos de l'enseignant (peut être null si non assigné)
    enseignant_nom = serializers.SerializerMethodField()

    def get_enseignant_nom(self, obj):
        # obj.enseignant peut être None (null=True dans le modèle)
        if obj.enseignant:
            return f"{obj.enseignant.grade}. {obj.enseignant.nom} {obj.enseignant.prenom}"
        return None

    class Meta:
        model  = Matiere
        fields = [
            'id', 'code', 'intitule', 'type_seance', 'volume_horaire',
            'niveau',          # id (pour écriture)
            'niveau_nom',      # nom lisible
            'filiere_code',    # code de la filière
            'enseignant',      # id (pour écriture)
            'enseignant_nom',  # nom lisible
        ]
