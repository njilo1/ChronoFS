"""
Permissions custom FSChrono.

Deux rôles uniquement (Role.DAR et Role.CHEF_DEPT). On en dérive trois
permissions principales :

- IsDAR             : seul le DAR peut lire / écrire
- IsChefDept        : seul un chef de département peut lire / écrire
- IsDARorReadOnly   : tout le monde authentifié peut lire, seul le DAR écrit
- ScopedToOwnDept   : combiné avec IsChefDept, garantit que le chef ne
                      voit / modifie que ce qui est rattaché à son dept

Ces classes sont injectées dans `permission_classes` des ViewSets pour
remplacer le AllowAny global défini en settings.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS

from core.constants import Role


def _is_authenticated(request) -> bool:
    return bool(request.user and request.user.is_authenticated)


class IsDAR(BasePermission):
    """Réservé exclusivement au compte DAR."""

    message = "Cette action est réservée à la DAR."

    def has_permission(self, request, view):
        return _is_authenticated(request) and request.user.role == Role.DAR


class IsChefDept(BasePermission):
    """Réservé exclusivement aux chefs de département."""

    message = "Cette action est réservée aux chefs de département."

    def has_permission(self, request, view):
        if not _is_authenticated(request):
            return False
        if request.user.role != Role.CHEF_DEPT:
            return False
        # Sécurité : un chef DOIT avoir un département associé. Sinon le
        # filtrage des querysets serait dangereux (potentiellement vide ou
        # tout-voyant selon les bugs).
        return request.user.departement_id is not None


class IsDARorReadOnly(BasePermission):
    """Tous les authentifiés peuvent lire (GET/HEAD/OPTIONS). Seul le DAR écrit."""

    message = "Seule la DAR peut modifier cette ressource."

    def has_permission(self, request, view):
        if not _is_authenticated(request):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == Role.DAR


class ScopedToOwnDept(BasePermission):
    """
    Permission objet : un chef ne peut accéder qu'aux objets rattachés à
    son propre département.

    Utilisé en complément de IsChefDept sur les endpoints /mon-departement/.
    Le filtrage initial du queryset garantit déjà la lecture limitée ;
    cette permission ferme la porte aux modifications par devinette d'ID
    (PUT /api/.../999 ne doit pas marcher si 999 appartient à un autre dept).
    """

    message = "Vous ne pouvez agir que sur les ressources de votre département."

    def has_object_permission(self, request, view, obj):
        if not _is_authenticated(request):
            return False
        user_dept = request.user.departement_id
        if user_dept is None:
            return False

        # Différents modèles ont différents chemins vers le département :
        # UE.filiere.departement, Enseignant.departements (M2M).
        if hasattr(obj, 'filiere') and obj.filiere is not None:
            return obj.filiere.departement_id == user_dept
        if hasattr(obj, 'departements'):
            return obj.departements.filter(pk=user_dept).exists()
        if hasattr(obj, 'departement_id'):
            return obj.departement_id == user_dept

        # Si on ne sait pas trancher → on refuse par défaut (principe du
        # moindre privilège : mieux vaut un faux négatif qu'une fuite).
        return False
