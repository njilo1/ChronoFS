"""
Migration de données : crée une SessionPlanification 'Historique' et y rattache
toutes les matières et EDT déjà présents en base avant l'introduction des sessions.

Évite ainsi la perte des données existantes et garantit que toutes les FK
session_id pointent vers une session valide.
"""

from datetime import date

from django.db import migrations


def creer_session_historique(apps, schema_editor):
    SessionPlanification = apps.get_model('planification', 'SessionPlanification')
    Matiere              = apps.get_model('matieres',      'Matiere')
    EmploiDuTemps        = apps.get_model('plannings',     'EmploiDuTemps')

    # Aucune donnée à migrer ? On sort proprement.
    nb_matieres_orphelines = Matiere.objects.filter(session__isnull=True).count()
    nb_edt_orphelins       = EmploiDuTemps.objects.filter(session__isnull=True).count()
    if nb_matieres_orphelines == 0 and nb_edt_orphelins == 0:
        return

    session, _ = SessionPlanification.objects.get_or_create(
        libelle='Historique (avant sessions)',
        defaults={
            'semaine_debut':    date(2025, 1, 1),
            'semaine_fin':      date(2025, 1, 7),
            'semestre':         '1',
            'annee_academique': '2024-2025',
            'etat':             'archive',
        },
    )

    Matiere.objects.filter(session__isnull=True).update(session=session)
    EmploiDuTemps.objects.filter(session__isnull=True).update(session=session)


def supprimer_session_historique(apps, schema_editor):
    """Reverse : retirer le rattachement et supprimer la session si vide."""
    SessionPlanification = apps.get_model('planification', 'SessionPlanification')
    Matiere              = apps.get_model('matieres',      'Matiere')
    EmploiDuTemps        = apps.get_model('plannings',     'EmploiDuTemps')

    session = SessionPlanification.objects.filter(libelle='Historique (avant sessions)').first()
    if session:
        Matiere.objects.filter(session=session).update(session=None)
        EmploiDuTemps.objects.filter(session=session).update(session=None)
        session.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('planification', '0001_initial'),
        ('matieres',      '0004_matiere_session_and_more'),
        ('plannings',     '0003_emploidutemps_session'),
    ]

    operations = [
        migrations.RunPython(creer_session_historique, supprimer_session_historique),
    ]
