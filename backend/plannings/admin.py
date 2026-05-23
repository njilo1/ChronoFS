from django.contrib import admin
from .models import EmploiDuTemps, Creneau

@admin.register(EmploiDuTemps)
class EmploiDuTempsAdmin(admin.ModelAdmin):
    list_display  = ['annee_academique', 'semestre', 'semaine_debut', 'semaine_fin', 'est_publie']
    list_filter   = ['annee_academique', 'semestre', 'est_publie']

@admin.register(Creneau)
class CreneauAdmin(admin.ModelAdmin):
    list_display  = ['jour', 'heure_debut', 'heure_fin', 'matiere', 'salle', 'genere_auto']
    list_filter   = ['jour', 'salle', 'genere_auto']
    search_fields = ['matiere__code', 'matiere__intitule']