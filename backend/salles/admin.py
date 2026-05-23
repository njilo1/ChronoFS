from django.contrib import admin
from .models import Salle

# On personnalise l'affichage de Salle dans l'admin
@admin.register(Salle)
class SalleAdmin(admin.ModelAdmin):

    # Colonnes affichées dans la liste des salles
    list_display = ['nom', 'capacite', 'campus', 'est_disponible']

    # Filtres sur la droite de la liste
    list_filter = ['campus', 'est_disponible']

    # Barre de recherche — chercher par nom
    search_fields = ['nom']