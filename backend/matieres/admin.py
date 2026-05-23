from django.contrib import admin
from .models import Matiere

@admin.register(Matiere)
class MatiereAdmin(admin.ModelAdmin):
    list_display  = ['code', 'intitule', 'type_seance', 'niveau', 'enseignant']
    list_filter   = ['type_seance', 'niveau__filiere']
    search_fields = ['code', 'intitule']