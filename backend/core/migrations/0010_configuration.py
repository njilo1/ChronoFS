"""
Schéma de la configuration du solver pilotable par le super-admin :
- ajoute le rôle SUPERADMIN aux choix du champ `User.role` ;
- crée `RegleSolver`, `FonctionObjectif`, `JournalGeneration`.

Migration additive : aucune donnée existante impactée.
"""

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

from core.constants import CategorieRegle, Role, SensObjectif, TypeRegle


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('core', '0009_ue_credits'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=Role.choices,
                help_text='Rôle fonctionnel (DAR ou CHEF_DEPT).',
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name='RegleSolver',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.SlugField(max_length=60, unique=True,
                    help_text="Identifiant stable relié à un handler du registre "
                              "(ex. 'H1'…'H9' pour les dures historiques, 'R_<slug>' pour "
                              "les règles dynamiques).")),
                ('nom', models.CharField(max_length=120)),
                ('description', models.TextField(blank=True,
                    help_text="Explication lisible affichée au DAR dans la modale de génération.")),
                ('type_regle', models.CharField(choices=TypeRegle.choices, default=TypeRegle.DURE, max_length=10)),
                ('categorie', models.CharField(choices=CategorieRegle.choices, default=CategorieRegle.DYNAMIQUE, max_length=10)),
                ('verrouillee', models.BooleanField(default=False)),
                ('active_par_defaut', models.BooleanField(default=True)),
                ('template', models.SlugField(blank=True, max_length=60, null=True)),
                ('parametres', models.JSONField(blank=True, default=dict)),
                ('ordre', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Règle du solver',
                'verbose_name_plural': 'Règles du solver',
                'ordering': ['ordre', 'code'],
            },
        ),
        migrations.CreateModel(
            name='FonctionObjectif',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.SlugField(max_length=60, unique=True,
                    help_text="Identifiant stable relié à un handler d'objectif du registre "
                              "(ex. 'OBJ_MAX_COURS', 'OBJ_VACATAIRES').")),
                ('nom', models.CharField(max_length=120)),
                ('description', models.TextField(blank=True)),
                ('sens', models.CharField(choices=SensObjectif.choices, default=SensObjectif.MAX, max_length=3)),
                ('priorite', models.PositiveIntegerField(default=1,
                    help_text='Rang lexicographique (1 = priorité maximale).')),
                ('verrouillee', models.BooleanField(default=False)),
                ('active_par_defaut', models.BooleanField(default=True)),
                ('template', models.SlugField(blank=True, max_length=60, null=True)),
                ('parametres', models.JSONField(blank=True, default=dict)),
                ('ordre', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Fonction objectif',
                'verbose_name_plural': 'Fonctions objectif',
                'ordering': ['priorite', 'code'],
            },
        ),
        migrations.CreateModel(
            name='JournalGeneration',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('lancee_le', models.DateTimeField(auto_now_add=True)),
                ('regles_appliquees', models.JSONField(blank=True, default=list)),
                ('objectifs_appliques', models.JSONField(blank=True, default=list)),
                ('nb_demandes', models.PositiveIntegerField(default=0)),
                ('nb_placees', models.PositiveIntegerField(default=0)),
                ('nb_non_placees', models.PositiveIntegerField(default=0)),
                ('taux', models.FloatField(default=0.0)),
                ('duree_ms', models.PositiveIntegerField(default=0)),
                ('statut_solver', models.CharField(blank=True, max_length=20)),
                ('lancee_par', models.ForeignKey(blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='generations_lancees', to=settings.AUTH_USER_MODEL)),
                ('semaine', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                    related_name='generations', to='core.semaine')),
            ],
            options={
                'verbose_name': 'Journal de génération',
                'verbose_name_plural': 'Journaux de génération',
                'ordering': ['-lancee_le'],
            },
        ),
    ]
