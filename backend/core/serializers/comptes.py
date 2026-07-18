"""
Serializers de gestion des comptes par le SUPER-ADMINISTRATEUR.

Le super-admin gère les comptes DAR et Chef de département. Contraintes métier
préservées :
- un seul compte DAR sur tout le système (UniqueConstraint `unique_dar_account`) ;
- un seul chef par département ;
- le rôle SUPERADMIN ne se crée pas via l'API (seed uniquement).

À la création sans mot de passe, un mot de passe est généré et renvoyé EN CLAIR
une seule fois (même mécanique que la gestion des chefs par le DAR).
"""

from rest_framework import serializers

from core.constants import Grade, Role
from core.models import Departement, User
from core.serializers.users import _generer_mot_de_passe


class CompteSerializer(serializers.ModelSerializer):
    """Lecture / mise à jour d'un compte existant (DAR ou Chef)."""

    role_display    = serializers.CharField(source='get_role_display',  read_only=True)
    grade_display   = serializers.CharField(source='get_grade_display', read_only=True)
    departement_nom = serializers.CharField(source='departement.nom',   read_only=True, default=None)

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


class CompteCreateSerializer(serializers.ModelSerializer):
    """Création d'un compte DAR ou Chef par le super-admin."""

    password = serializers.CharField(
        write_only=True, required=False, allow_blank=True,
        style={'input_type': 'password'},
        help_text="Si vide, un mot de passe est généré et renvoyé en clair UNE seule fois.",
    )
    role = serializers.ChoiceField(choices=[
        (Role.DAR, Role.DAR.label),
        (Role.CHEF_DEPT, Role.CHEF_DEPT.label),
    ])
    departement = serializers.PrimaryKeyRelatedField(
        queryset=Departement.objects.all(), required=False, allow_null=True,
    )
    grade = serializers.ChoiceField(choices=Grade.choices, required=False, allow_blank=True)

    class Meta:
        model  = User
        fields = (
            'id', 'username', 'password', 'role',
            'first_name', 'last_name', 'email',
            'grade', 'telephone', 'departement', 'is_active',
        )
        extra_kwargs = {
            'username':   {'required': True},
            'is_active':  {'default':  True},
            'first_name': {'required': False, 'allow_blank': True},
            'last_name':  {'required': False, 'allow_blank': True},
            'email':      {'required': False, 'allow_blank': True},
        }

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def validate_password(self, value):
        if value:
            from django.contrib.auth.password_validation import validate_password
            validate_password(value)
        return value

    def validate(self, attrs):
        role = attrs.get('role')
        dept = attrs.get('departement')
        if role == Role.DAR:
            # Un seul DAR autorisé sur tout le système.
            if User.objects.filter(role=Role.DAR).exists():
                raise serializers.ValidationError(
                    "Un compte DAR existe déjà. Modifiez-le ou réinitialisez son "
                    "mot de passe plutôt que d'en créer un second."
                )
            attrs['departement'] = None
        elif role == Role.CHEF_DEPT:
            if dept is None:
                raise serializers.ValidationError(
                    {'departement': "Un chef de département doit être rattaché à un département."}
                )
            if User.objects.filter(role=Role.CHEF_DEPT, departement=dept).exists():
                raise serializers.ValidationError(
                    {'departement': f"Le département {dept.code} a déjà un chef."}
                )
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password', '') or _generer_mot_de_passe()
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        user._password_generated = password
        return user
