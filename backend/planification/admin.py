from django.contrib import admin
from .models import SessionPlanification, ImportDepartement


class ImportDepartementInline(admin.TabularInline):
    model = ImportDepartement
    extra = 0
    readonly_fields = ['date_import', 'fichier_nom', 'nb_matieres', 'nb_erreurs']
    fields = ['departement', 'date_import', 'fichier_nom', 'nb_matieres', 'nb_erreurs']


@admin.register(SessionPlanification)
class SessionPlanificationAdmin(admin.ModelAdmin):
    list_display  = ['libelle', 'semaine_debut', 'semaine_fin', 'semestre', 'etat', 'cree_le']
    list_filter   = ['etat', 'semestre', 'annee_academique']
    search_fields = ['libelle']
    date_hierarchy = 'semaine_debut'
    inlines = [ImportDepartementInline]


@admin.register(ImportDepartement)
class ImportDepartementAdmin(admin.ModelAdmin):
    list_display  = ['session', 'departement', 'date_import', 'nb_matieres', 'nb_erreurs']
    list_filter   = ['session', 'departement']
    search_fields = ['departement__code', 'departement__nom']
    readonly_fields = ['date_import', 'fichier_nom', 'nb_matieres', 'nb_erreurs']
