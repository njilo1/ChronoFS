from django.contrib import admin
from .models import Departement, Filiere, Niveau

@admin.register(Departement)
class DepartementAdmin(admin.ModelAdmin):
    # Afficher ces colonnes dans la liste
    list_display = ['code', 'nom']
    search_fields = ['nom', 'code']


@admin.register(Filiere)
class FiliereAdmin(admin.ModelAdmin):
    list_display = ['code', 'nom', 'departement', 'effectif']
    list_filter = ['departement']
    search_fields = ['nom', 'code']


@admin.register(Niveau)
class NiveauAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'filiere', 'nom', 'effectif']
    list_filter = ['filiere', 'nom']