"""
Commande Django : python manage.py seed_superadmin

Crée (idempotemment) :
- la configuration fondatrice du solver (9 règles dures + 5 objectifs), au cas
  où la base n'aurait pas été migrée depuis un flush ;
- le compte SUPER-ADMINISTRATEUR (identifiants issus de settings /
  variables d'environnement `SUPERADMIN_USERNAME` / `SUPERADMIN_PASSWORD`).

100 % rejouable : `get_or_create` partout, aucun doublon.

⚠️ Le mot de passe par défaut (`FS-UEB@#2026.`) doit être changé après la
première connexion, ou surchargé via `.env` avant le déploiement.
"""

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from core.constants import Role
from core.models import FonctionObjectif, RegleSolver, User
from core.seed_config import seeder_configuration


class Command(BaseCommand):
    help = "Crée le compte super-administrateur et la configuration fondatrice du solver."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("🛡️  Seed super-administrateur\n"))

        # 1) Configuration fondatrice (règles + objectifs) — idempotent.
        seeder_configuration(RegleSolver, FonctionObjectif)
        self.stdout.write(
            f"• Configuration solver : {RegleSolver.objects.count()} règles, "
            f"{FonctionObjectif.objects.count()} objectifs."
        )

        # 2) Compte super-admin.
        username = settings.SUPERADMIN_USERNAME
        password = settings.SUPERADMIN_PASSWORD
        admin, created = User.objects.get_or_create(
            username=username,
            defaults={
                'role':         Role.SUPERADMIN,
                'first_name':   'Super',
                'last_name':    'Administrateur',
                'is_staff':     True,
                'is_superuser': True,
            },
        )
        if created:
            admin.set_password(password)
            admin.save()
            self.stdout.write(self.style.SUCCESS(
                f"• Compte super-admin créé : {username} / {password}"
            ))
            self.stdout.write(self.style.WARNING(
                "  ⚠️  Changez ce mot de passe après la première connexion."
            ))
        else:
            # On garantit au moins que le rôle est correct (sans toucher au mdp).
            if admin.role != Role.SUPERADMIN:
                admin.role = Role.SUPERADMIN
                admin.save(update_fields=['role'])
            self.stdout.write(f"• Compte super-admin déjà présent : {username} (inchangé).")

        self.stdout.write(self.style.SUCCESS("\n✓ Seed super-administrateur terminé."))
