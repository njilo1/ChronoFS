from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import EmploiDuTemps, Creneau, CreneauExamen
from .serializers import EmploiDuTempsSerializer, CreneauSerializer, CreneauExamenSerializer
from .export_pdf import generer_pdf_edt, generer_pdf_examens


class EmploiDuTempsViewSet(viewsets.ModelViewSet):
    """API CRUD pour les emplois du temps (cours, examen, rattrapage)."""

    queryset = EmploiDuTemps.objects.select_related('campus').all()
    serializer_class   = EmploiDuTempsSerializer
    permission_classes = [AllowAny]

    # GET /api/emplois-du-temps/?type_planning=cours&campus=1&est_publie=true
    filterset_fields = ['type_planning', 'campus', 'campus__ville', 'est_publie', 'semestre', 'annee_academique']
    ordering_fields  = ['-semaine_debut']


class CreneauViewSet(viewsets.ModelViewSet):
    """API CRUD pour les créneaux de cours."""

    queryset = (
        Creneau.objects
        .select_related('salle', 'matiere__enseignant', 'matiere__niveau__filiere', 'emploi_du_temps')
        .all()
    )
    serializer_class   = CreneauSerializer
    permission_classes = [AllowAny]

    filterset_fields = ['emploi_du_temps', 'jour', 'heure_debut', 'salle', 'genere_auto']
    ordering_fields  = ['jour', 'heure_debut']


class CreneauExamenViewSet(viewsets.ModelViewSet):
    """API CRUD pour les créneaux d'examen et de rattrapage."""

    queryset = (
        CreneauExamen.objects
        .select_related('salle', 'filiere', 'niveau', 'chef_salle', 'emploi_du_temps')
        .prefetch_related('surveillants')
        .all()
    )
    serializer_class   = CreneauExamenSerializer
    permission_classes = [AllowAny]

    # GET /api/creneaux-examen/?emploi_du_temps=1&jour=2026-04-13
    filterset_fields = ['emploi_du_temps', 'jour', 'heure_debut', 'salle', 'filiere', 'niveau']
    ordering_fields  = ['jour', 'heure_debut', 'salle__nom']


class ExportPDFView(APIView):
    """
    GET /api/emplois-du-temps/<pk>/export-pdf/
    Génère et retourne le PDF officiel UEB pour un emploi du temps de cours.
    """
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            edt = EmploiDuTemps.objects.select_related('campus').get(pk=pk)
        except EmploiDuTemps.DoesNotExist:
            return Response({'error': 'Emploi du temps introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if edt.type_planning in ('examen', 'rattrapage'):
            buffer = generer_pdf_examens(pk)
            type_code = 'EX' if edt.type_planning == 'examen' else 'RAT'
        else:
            buffer = generer_pdf_edt(pk)
            type_code = 'EDT'

        campus_code = edt.campus.code if edt.campus else 'FS'
        filename = f"{type_code}_{campus_code}_{edt.annee_academique}_S{edt.semestre}_{edt.semaine_debut}.pdf"

        response = HttpResponse(buffer.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="{filename}"'
        return response
