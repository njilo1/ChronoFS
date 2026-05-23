"""
Serializers d'authentification.

- LoginSerializer  : étend TokenObtainPairSerializer pour renvoyer dans
                     la même réponse l'objet user complet (utile au
                     frontend pour décider quel dashboard montrer).
- MeSerializer     : représentation user pour /api/auth/me/.
"""

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
