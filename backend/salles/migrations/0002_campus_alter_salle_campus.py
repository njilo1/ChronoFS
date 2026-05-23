"""
Migration : Création du modèle Campus + conversion du champ campus (CharField → FK).

Le champ campus de Salle était un CharField avec les valeurs :
  'principal' → Campus Principal FS (Ebolowa)
  'lycee'     → Lycée Classique (Ebolowa)
  'cra'       → Face CRA (Ebolowa)

Cette migration :
  1. Crée le modèle Campus
  2. Renomme le champ campus en campus_legacy (pour préserver les données)
  3. Ajoute le nouveau champ campus (FK nullable)
  4. DataMigration : crée les 4 campus par défaut + assigne les salles existantes
  5. Supprime campus_legacy
"""

import django.db.models.deletion
from django.db import migrations, models


def creer_campus_et_assigner(apps, schema_editor):
    """Crée les campus par défaut et assigne les salles existantes."""
    Campus = apps.get_model('salles', 'Campus')
    Salle  = apps.get_model('salles', 'Salle')

    # Créer les campus par défaut de la Faculté des Sciences UEB
    campus_ebolowa_principal = Campus.objects.create(
        code='CPF', nom='Campus Principal FS', ville='Ebolowa', est_principal=True,
    )
    campus_lycee = Campus.objects.create(
        code='LYC', nom='Lycée Classique', ville='Ebolowa', est_principal=False,
    )
    campus_cra = Campus.objects.create(
        code='CRA', nom='Face CRA', ville='Ebolowa', est_principal=False,
    )
    Campus.objects.create(
        code='MON', nom='Campus de Monatélé', ville='Monatélé', est_principal=False,
    )

    # Mapper les valeurs legacy vers les nouveaux objets Campus
    mapping = {
        'principal': campus_ebolowa_principal,
        'lycee':     campus_lycee,
        'cra':       campus_cra,
    }

    # Assigner chaque salle au bon campus
    for salle in Salle.objects.all():
        campus_obj = mapping.get(salle.campus_legacy)
        if campus_obj:
            salle.campus = campus_obj
            salle.save(update_fields=['campus'])


def annuler_campus(apps, schema_editor):
    """Annulation : vide le champ campus des salles (les Campus seront supprimés par la cascade)."""
    Salle = apps.get_model('salles', 'Salle')
    Salle.objects.all().update(campus=None)


class Migration(migrations.Migration):

    dependencies = [
        ('salles', '0001_initial'),
    ]

    operations = [
        # Étape 1 : Créer le modèle Campus
        migrations.CreateModel(
            name='Campus',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nom',          models.CharField(max_length=100)),
                ('code',         models.CharField(max_length=10, unique=True)),
                ('ville',        models.CharField(max_length=100)),
                ('adresse',      models.CharField(blank=True, max_length=200)),
                ('est_principal', models.BooleanField(default=False)),
            ],
            options={
                'verbose_name': 'Campus',
                'verbose_name_plural': 'Campus',
                'ordering': ['-est_principal', 'ville', 'nom'],
            },
        ),

        # Étape 2 : Renommer l'ancien champ campus → campus_legacy
        migrations.RenameField(
            model_name='salle',
            old_name='campus',
            new_name='campus_legacy',
        ),

        # Étape 3 : Ajouter le nouveau champ campus (FK nullable)
        migrations.AddField(
            model_name='salle',
            name='campus',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='salles',
                to='salles.campus',
            ),
        ),

        # Étape 4 : DataMigration — créer les campus par défaut et assigner les salles
        migrations.RunPython(creer_campus_et_assigner, annuler_campus),

        # Étape 5 : Supprimer l'ancien champ campus_legacy
        migrations.RemoveField(
            model_name='salle',
            name='campus_legacy',
        ),
    ]
