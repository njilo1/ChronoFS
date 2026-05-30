"""
Serializers d'authentification.

- LoginSerializer  : étend TokenObtainPairSerializer pour renvoyer dans
                     la même réponse l'objet user complet (utile au
                     frontend pour décider quel dashboard montrer).
- MeSerializer     : représentation user pour /api/auth/me/.
"""

from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from core.models import User


class MeSerializer(serializers.ModelSerializer):
    """Profil utilisateur complet retourné par /api/auth/me/."""

    role_display       = serializers.CharField(source='get_role_display',  read_only=True)
    grade_display      = serializers.CharField(source='get_grade_display', read_only=True)
    departement_code   = serializers.CharField(source='departement.code',  read_only=True, default=None)
    departement_nom    = serializers.CharField(source='departement.nom',   read_only=True, default=None)

    class Meta:
        model  = User
        fields = (
            'id', 'username',
            'first_name', 'last_name', 'email',
            'role', 'role_display',
            'grade', 'grade_display',
            'telephone',
            'departement', 'departement_code', 'departement_nom',
            'is_active', 'date_joined', 'last_login',
        )
        read_only_fields = fields  # consulté uniquement, pas modifiable ici


class LoginSerializer(TokenObtainPairSerializer):
    """
    Renvoie {access, refresh, user:{...}} au lieu du simple {access, refresh}.

    Permet au frontend d'éviter un GET /api/auth/me/ supplémentaire juste
    après la connexion.
    """

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Claims supplémentaires placés DANS le JWT (lisibles côté client)
        token['role']           = user.role
        token['username']       = user.username
        token['departement_id'] = user.departement_id
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = MeSerializer(self.user).data
        return data


class ProfilUpdateSerializer(serializers.ModelSerializer):
    """
    Modification par l'utilisateur de SON propre profil (PATCH /api/auth/me/).

    Champs autorisés uniquement : identité et coordonnées. `role`,
    `departement`, `is_active` et le mot de passe sont volontairement exclus
    (le mot de passe a son endpoint dédié, le reste relève du DAR).
    L'unicité de `username` est garantie par le modèle (validateur DRF).
    """

    class Meta:
        model  = User
        fields = ('username', 'first_name', 'last_name', 'email', 'telephone', 'grade')

    def validate_username(self, value):
        value = (value or '').strip()
        if not value:
            raise serializers.ValidationError("Le nom d'utilisateur ne peut pas être vide.")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    """
    Changement de mot de passe par l'utilisateur lui-même
    (POST /api/auth/change-password/).

    Vérifie l'ancien mot de passe, applique les validateurs Django au
    nouveau, et exige une confirmation identique.
    """

    ancien_password      = serializers.CharField(write_only=True)
    nouveau_password     = serializers.CharField(write_only=True)
    confirmation         = serializers.CharField(write_only=True)

    def validate_ancien_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Mot de passe actuel incorrect.")
        return value

    def validate_nouveau_password(self, value):
        validate_password(value, self.context['request'].user)
        return value

    def validate(self, attrs):
        if attrs['nouveau_password'] != attrs['confirmation']:
            raise serializers.ValidationError(
                {'confirmation': "La confirmation ne correspond pas au nouveau mot de passe."}
            )
        if attrs['nouveau_password'] == attrs['ancien_password']:
            raise serializers.ValidationError(
                {'nouveau_password': "Le nouveau mot de passe doit être différent de l'ancien."}
            )
        return attrs
