"""Serializer pour les ArchivePlanning (exports versionnés)."""

from rest_framework import serializers

from core.models import ArchivePlanning


class ArchivePlanningSerializer(serializers.ModelSerializer):
    semaine_libelle = serializers.SerializerMethodField()
    exporte_par_nom = serializers.SerializerMethodField()
    pdf_url         = serializers.SerializerMethodField()
    docx_url        = serializers.SerializerMethodField()

    class Meta:
        model  = ArchivePlanning
        fields = (
            'id', 'semaine', 'semaine_libelle',
            'version', 'exporte_le',
            'exporte_par', 'exporte_par_nom',
            'fichier_pdf',  'pdf_url',
            'fichier_docx', 'docx_url',
        )
        read_only_fields = fields

    def get_semaine_libelle(self, obj) -> str:
        s = obj.semaine
        return f'Semaine du {s.date_debut:%d/%m/%Y} au {s.date_fin:%d/%m/%Y}'

    def get_exporte_par_nom(self, obj) -> str:
        return obj.exporte_par.username if obj.exporte_par else '—'

    def get_pdf_url(self, obj) -> str:
        if not obj.fichier_pdf:
            return ''
        req = self.context.get('request')
        return req.build_absolute_uri(obj.fichier_pdf.url) if req else obj.fichier_pdf.url

    def get_docx_url(self, obj) -> str:
        if not obj.fichier_docx:
            return ''
        req = self.context.get('request')
        return req.build_absolute_uri(obj.fichier_docx.url) if req else obj.fichier_docx.url
