"""
Modèles FSChrono v2 — réexport unifié.

Permet `from core.models import User, Campus, Seance, ...` sans avoir à
connaître la sous-arborescence (referentiel / users / hebdomadaire).

Ordre d'import important :
1. users     : User custom (référence Departement via FK string)
2. referentiel : Campus → Salle → Departement → Filiere → Enseignant → UE → AnneeAcademique
3. hebdomadaire : Semaine → ImportPlanning(+Historique) → DemandeCours → Seance → ArchivePlanning
"""

from .users import User
from .referentiel import (
    AnneeAcademique,
    Campus,
    Departement,
    Enseignant,
    Filiere,
    Salle,
    UE,
)
from .hebdomadaire import (
    ArchivePlanning,
    DemandeCours,
    ImportPlanning,
    ImportPlanningHistorique,
    Seance,
    Semaine,
)


__all__ = [
    'User',
    'Campus', 'Salle',
    'Departement', 'Filiere',
    'Enseignant', 'UE',
    'AnneeAcademique', 'Semaine',
    'ImportPlanning', 'ImportPlanningHistorique',
    'DemandeCours', 'Seance', 'ArchivePlanning',
]
