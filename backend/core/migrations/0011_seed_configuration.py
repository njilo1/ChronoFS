"""
Data-migration : seed idempotent des 9 règles dures (H1–H9) et des 5 fonctions
objectif fondatrices, verrouillées et actives par défaut.

Source unique : `core.seed_config.seeder_configuration` (partagée avec la
commande `seed_superadmin`). Idempotent : `get_or_create` par `code`.
"""

from django.db import migrations

from core.seed_config import seeder_configuration


def seed(apps, schema_editor):
    RegleSolver = apps.get_model('core', 'RegleSolver')
    FonctionObjectif = apps.get_model('core', 'FonctionObjectif')
    seeder_configuration(RegleSolver, FonctionObjectif)


def unseed(apps, schema_editor):
    # On ne retire que les entrées fondatrices (verrouillées).
    apps.get_model('core', 'RegleSolver').objects.filter(verrouillee=True).delete()
    apps.get_model('core', 'FonctionObjectif').objects.filter(verrouillee=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0010_configuration'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
