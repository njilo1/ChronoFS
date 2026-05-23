"""
Serializers pour la gestion des chefs de département (DAR uniquement).

On n'expose JAMAIS la gestion du compte DAR via l'API (contrainte unique
au niveau BDD + opération sensible). Le compte DAR se crée via seed_demo
ou createsuperuser.
"""

import secrets
import string

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from core.constants import Grade, Role
from core.models import Departement, User


def _generer_mot_de_passe(longueur: int = 12) -> str:
    """Génère un mot de passe aléatoire mémorisable (lettres + chiffres)."""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(longueur))


class ChefDeptSerializer(serializers.ModelSerializer):
    """Lecture / mise à jour d'un chef de département existant."""

    role          = serializers.CharField(read_only=True)
    role_display  = serializers.CharField(source='get_role_display',  read_only=True)
    grade_display = serializers.CharField(source='get_grade_display', read_only=True)
    departement_nom = serializers.CharField(source='departement.nom', read_only=True, default=None)

    class Meta:
        model  = User
        fields = (
            'id', 'username', 'first_name', 'last_name', 'email',
            'role', 'role_display',
            'grade', 'grade_display',
            'telephone',
            'departement', 'departement_nom',
            'is_active', 'date_joined', 'last_login',
        )
        read_only_fields = ('id', 'role', 'role_display', 'date_joined', 'last_login')


class ChefDeptCreateSerializer(serializers.ModelSerializer):
    """
    Création d'un nouveau chef de département par le DAR.

    Le rôle est forcé à CHEF_DEPT (impossible de créer un second DAR ici —
    de toute façon la contrainte BDD le rejetterait).
    """

    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True,
        style={'input_type': 'password'},
        help_text="Si vide, un mot de passe sera généré et renvoyé en clair UNE seule fois.",
    )
    departement = serializers.PrimaryKeyRelatedField(
        queryset=Departement.objects.all(),
        required=True,
    )
    grade = serializers.ChoiceField(choices=Grade.choices, required=True)

    class Meta:
        model  = User
        fields = (
            'id', 'username', 'password',
            'first_name', 'last_name', 'email',
            'grade', 'telephone', 'departement',
            'is_active',
        )
        extra_kwargs = {
            'username':   {'required': True},
            'is_active':  {'default':  True},
            'first_name': {'required': False, 'allow_blank': True},
            'last_name':  {'required': True},
            'email':      {'required': False, 'allow_blank': True},
        }

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def validate_departement(self, value):
        # Un seul chef par département (règle métier — sinon ambigu).
        if User.objects.filter(role=Role.CHEF_DEPT, departement=value).exists():
            raise serializers.ValidationError(
                f"Le département {value.code} a déjà un chef. Modifiez ou supprimez "
                "le chef existant avant d'en créer un autre."
            )
        return value

    def validate_password(self, value):
        if value:
            validate_password(value)
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', '') or _generer_mot_de_passe()
        user = User(role=Role.CHEF_DEPT, **validated_data)
        user.set_password(password)
        user.save()
        # On planque le mot de passe en clair sur l'instance le temps d'une
        # réponse — le ViewSet le récupère pour le renvoyer une seule fois.
        user._password_generated = password
        return user


class ResetPasswordSerializer(serializers.Serializer):
    """Body de POST /api/chefs-departement/<id>/reset-password/"""

    nouveau_password = serializers.CharField(
        required=False, allow_blank=True, write_only=True,
        help_text="Si vide, un mot de passe est généré et renvoyé une seule fois.",
    )

    def validate_nouveau_password(self, value):
        if value:
            validate_password(value)
        return value
