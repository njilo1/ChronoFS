"""
Interface admin Django FSChrono.

Pas destinée aux utilisateurs finaux — c'est un outil de support pour
l'équipe technique : inspecter / réparer la BDD, vérifier l'état d'une
semaine, retrouver un import historique.

Le frontend React expose les vrais workflows pour DAR et chefs.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.utils.html import format_html

from core.models import (
    AnneeAcademique,
    ArchivePlanning,
    Campus,
    DemandeCours,
    Departement,
    Enseignant,
    Filiere,
    ImportPlanning,
    ImportPlanningHistorique,
    Salle,
    Seance,
    Semaine,
    UE,
    User,
)


# ── Utilisateurs ─────────────────────────────────────────────────────────────
@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display    = ('username', 'role', 'departement', 'grade', 'is_active', 'is_superuser')
    list_filter     = ('role', 'departement', 'is_active')
    search_fields   = ('username', 'first_name', 'last_name', 'email')
    ordering        = ('username',)

    # On ajoute nos champs custom dans l'écran d'édition de Django.
    fieldsets = DjangoUserAdmin.fieldsets + (
        ('FSChrono', {
            'fields': ('role', 'departement', 'grade', 'telephone'),
        }),
    )
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        ('FSChrono', {
            'fields': ('role', 'departement', 'grade', 'telephone'),
        }),
    )


# ── Référentiel géographique ─────────────────────────────────────────────────
@admin.register(Campus)
class CampusAdmin(admin.ModelAdmin):
    list_display  = ('nom', 'ville', 'nb_salles')
    list_filter   = ('ville',)
    search_fields = ('nom',)

    @admin.display(description='Nb salles')
    def nb_salles(self, obj):
        return obj.salles.count()


@admin.register(Salle)
class SalleAdmin(admin.ModelAdmin):
    list_display  = ('nom', 'campus', 'capacite', 'type_salle', 'disponible')
    list_filter   = ('campus__ville', 'campus', 'type_salle', 'disponible')
    search_fields = ('nom', 'campus__nom')
    ordering      = ('campus', 'nom')


# ── Organisation pédagogique ─────────────────────────────────────────────────
@admin.register(Departement)
class DepartementAdmin(admin.ModelAdmin):
    list_display  = ('code', 'nom', 'nb_filieres', 'nb_enseignants')
    search_fields = ('code', 'nom')

    @admin.display(description='Filières')
    def nb_filieres(self, obj):
        return obj.filieres.count()

    @admin.display(description='Enseignants')
    def nb_enseignants(self, obj):
        return obj.enseignants.count()


@admin.register(Filiere)
class FiliereAdmin(admin.ModelAdmin):
    list_display  = ('code', 'niveau', 'nom', 'departement', 'ville', 'effectif')
    list_filter   = ('niveau', 'ville', 'departement')
    search_fields = ('code', 'nom')
    ordering      = ('departement', 'code', 'niveau')


@admin.register(Enseignant)
class EnseignantAdmin(admin.ModelAdmin):
    list_display     = ('nom', 'grade', 'liste_departements')
    list_filter      = ('grade', 'departements')
    search_fields    = ('nom',)
    filter_horizontal = ('departements',)

    @admin.display(description='Départements')
    def liste_departements(self, obj):
        return ', '.join(d.code for d in obj.departements.all()) or '—'


@admin.register(UE)
class UEAdmin(admin.ModelAdmin):
    list_display  = ('code', 'intitule', 'filiere')
    list_filter   = ('filiere__departement', 'filiere__niveau', 'filiere__ville')
    search_fields = ('code', 'intitule')
    ordering      = ('code',)


# ── Calendrier ───────────────────────────────────────────────────────────────
@admin.register(AnneeAcademique)
class AnneeAcademiqueAdmin(admin.ModelAdmin):
    list_display  = ('libelle', 'date_debut', 'date_fin', 'active')
    list_filter   = ('active',)
    search_fields = ('libelle',)


@admin.register(Semaine)
class SemaineAdmin(admin.ModelAdmin):
    list_display  = ('date_debut', 'date_fin', 'semestre', 'annee_academique', 'statut', 'numero_reference')
    list_filter   = ('statut', 'semestre', 'annee_academique')
    date_hierarchy = 'date_debut'


# ── Imports ──────────────────────────────────────────────────────────────────
@admin.register(ImportPlanning)
class ImportPlanningAdmin(admin.ModelAdmin):
    list_display  = ('semaine', 'departement', 'uploaded_by', 'uploaded_at', 'statut_parsing', 'nb_demandes')
    list_filter   = ('statut_parsing', 'departement', 'semaine')
    search_fields = ('departement__code',)
    readonly_fields = ('uploaded_at',)

    @admin.display(description='Demandes')
    def nb_demandes(self, obj):
        return obj.demandes.count()


@admin.register(ImportPlanningHistorique)
class ImportPlanningHistoriqueAdmin(admin.ModelAdmin):
    list_display = ('semaine', 'departement', 'version', 'uploaded_by', 'uploaded_at', 'remplace_le')
    list_filter  = ('departement', 'semaine')
    readonly_fields = ('uploaded_at', 'remplace_le')


# ── Demandes & séances ───────────────────────────────────────────────────────
@admin.register(DemandeCours)
class DemandeCoursAdmin(admin.ModelAdmin):
    list_display  = ('filiere', 'ue', 'enseignant', 'jour', 'creneau', 'type_cours', 'effectif_declare')
    list_filter   = ('type_cours', 'jour', 'creneau', 'filiere__ville')
    search_fields = ('ue__code', 'ue__intitule', 'filiere__code')


@admin.register(Seance)
class SeanceAdmin(admin.ModelAdmin):
    list_display  = ('semaine', 'filiere', 'ue', 'enseignant', 'salle', 'jour', 'creneau', 'type_cours', 'modifie_manuellement')
    list_filter   = ('semaine', 'jour', 'creneau', 'type_cours', 'salle__campus', 'modifie_manuellement')
    search_fields = ('ue__code', 'ue__intitule', 'filiere__code', 'salle__nom')
    readonly_fields = ('modifie_le',)


# ── Archives ─────────────────────────────────────────────────────────────────
@admin.register(ArchivePlanning)
class ArchivePlanningAdmin(admin.ModelAdmin):
    list_display    = ('semaine', 'version', 'exporte_le', 'exporte_par', 'lien_pdf')
    list_filter     = ('semaine',)
    readonly_fields = ('exporte_le',)

    @admin.display(description='PDF')
    def lien_pdf(self, obj):
        if obj.fichier_pdf:
            return format_html('<a href="{}" target="_blank">Ouvrir</a>', obj.fichier_pdf.url)
        return '—'


# Personnalisation des titres de l'admin
admin.site.site_header  = 'FSChrono — Administration'
admin.site.site_title   = 'FSChrono Admin'
admin.site.index_title  = 'Tableau de bord administrateur'
