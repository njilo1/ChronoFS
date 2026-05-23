from django.contrib import admin
from .models import Enseignant

@admin.register(Enseignant)
class EnseignantAdmin(admin.ModelAdmin):

    # Colonnes affichées dans la liste
    list_display = ['grade', 'nom', 'prenom', 'email', 'specialite', 'est_actif']

    # Filtres à droite
    list_filter = ['grade', 'est_actif', 'departements']

    # Barre de recherche
    search_fields = ['nom', 'prenom', 'email']

    # Afficher les départements avec des cases à cocher
    filter_horizontal = ['departements']