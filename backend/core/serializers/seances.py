"""
Serializers pour les Seance — sortie du solver + édition manuelle DAR.

Deux flavors :
- SeanceSerializer       : lecture (grille planning, exports)
- SeanceEditSerializer   : PATCH par le DAR (déplacement / changement
                           de salle / changement d'enseignant) avec
                           audit `modifie_par`/`modifie_le`/`modifie_manuellement`.
"""

from django.utils import timezone
from rest_framework import serializers

from core.models import Seance


class SeanceSerializer(serializers.ModelSerializer):
    """Représentation pour l'affichage (grille DAR, consultation chef)."""

    filiere_libelle    = serializers.SerializerMethodField()
    ue_code            = serializers.CharField(source='ue.code',                read_only=True)
    ue_intitule        = serializers.CharField(source='ue.intitule',            read_only=True)
    enseignant_nom     = serializers.SerializerMethodField()
    salle_nom          = serializers.CharField(source='salle.nom',              read_only=True)
    salle_campus       = serializers.CharField(source='salle.campus.nom',       read_only=True)
    salle_ville        = serializers.CharField(source='salle.campus.ville',     read_only=True)
    jour_display       = serializers.CharField(source='get_jour_display',       read_only=True)
    creneau_display    = serializers.CharField(source='get_creneau_display',    read_only=True)
    type_cours_display = serializers.CharField(source='get_type_cours_display', read_only=True)

    class Meta:
        model  = Seance
        fields = (
            'id', 'semaine',
            'filiere', 'filiere_libelle',
            'ue', 'ue_code', 'ue_intitule',
            'enseignant', 'enseignant_nom',
            'salle', 'salle_nom', 'salle_campus', 'salle_ville',
            'jour', 'jour_display',
            'creneau', 'creneau_display',
            'type_cours', 'type_cours_display',
            'modifie_manuellement', 'modifie_le', 'modifie_par',
        )
        read_only_fields = fields  # lecture seule via cet endpoint

    def get_filiere_libelle(self, obj) -> str:
        f = obj.filiere
        return f'{f.code} {f.niveau} ({f.get_ville_display()})'

    def get_enseignant_nom(self, obj) -> str:
        if obj.enseignant_id is None:
            return 'Non assigné'
        return f'{obj.enseignant.get_grade_display()} {obj.enseignant.nom}'


class SeanceEditSerializer(serializers.ModelSerializer):
    """
    PATCH par le DAR pour modifier manuellement une séance après
    génération automatique. Audit obligatoire.

    Validation explicite des contraintes UniqueConstraint (`(semaine,
    salle, jour, creneau)` et `(semaine, filiere, jour, creneau)`) pour
    renvoyer un 400 avec message lisible plutôt qu'une 500 IntegrityError
    quand un drag-drop tombe sur une case déjà occupée.
    """

    class Meta:
        model  = Seance
        fields = ('salle', 'enseignant', 'ue', 'jour', 'creneau', 'type_cours')

    def validate(self, attrs):
        instance = self.instance
        # Valeurs effectives après PATCH (champ absent → on garde l'actuel).
        salle      = attrs.get('salle',      instance.salle)
        enseignant = attrs.get('enseignant', instance.enseignant)
        ue         = attrs.get('ue',         instance.ue)
        jour       = attrs.get('jour',       instance.jour)
        creneau    = attrs.get('creneau',    instance.creneau)

        # Indisponibilité de l'enseignant au créneau visé (contrainte dure).
        if enseignant is not None:
            from core.services.disponibilites import creneaux_bloques
            if (enseignant.id, jour, creneau) in creneaux_bloques(instance.semaine):
                raise serializers.ValidationError({'detail':
                    f"{enseignant.nom} est indisponible à ce créneau."
                })

        # L'UE choisie doit appartenir à la filière de la séance (on remplace
        # le cours par un autre cours de la même classe — jamais d'une autre).
        if ue is not None and ue.filiere_id != instance.filiere_id:
            raise serializers.ValidationError({'detail':
                f"L'UE {ue.code} n'appartient pas à la filière {instance.filiere}. "
                "Choisissez une UE de cette classe."
            })

        # H7 — la salle doit être dans la même ville que la filière.
        if salle is not None and salle.campus.ville != instance.filiere.ville:
            raise serializers.ValidationError({'detail':
                f"La salle {salle.nom} est à {salle.campus.get_ville_display()}, "
                f"mais {instance.filiere} est à {instance.filiere.get_ville_display()}. "
                "Choisissez une salle de la même ville."
            })

        # H7bis — campus imposé éventuel de la filière.
        campus_force = instance.filiere.get_campus_contraint()
        if salle is not None and campus_force is not None and salle.campus_id != campus_force.id:
            raise serializers.ValidationError({'detail':
                f"{instance.filiere} doit se tenir au campus « {campus_force.nom} ». "
                f"La salle {salle.nom} n'y appartient pas."
            })

        autres = Seance.objects.filter(semaine=instance.semaine).exclude(pk=instance.pk)

        if autres.filter(salle=salle, jour=jour, creneau=creneau).exists():
            raise serializers.ValidationError({'detail':
                f"La salle {salle.nom} est déjà occupée le "
                f"{Seance(jour=jour).get_jour_display()} "
                f"{Seance(creneau=creneau).get_creneau_display()}."
            })

        if autres.filter(filiere=instance.filiere, jour=jour, creneau=creneau).exists():
            raise serializers.ValidationError({'detail':
                f"{instance.filiere} a déjà un cours le "
                f"{Seance(jour=jour).get_jour_display()} "
                f"{Seance(creneau=creneau).get_creneau_display()}."
            })

        if enseignant is not None and autres.filter(
            enseignant=enseignant, jour=jour, creneau=creneau,
        ).exists():
            raise serializers.ValidationError({'detail':
                f"{enseignant.get_grade_display()} {enseignant.nom} a déjà un cours "
                f"le {Seance(jour=jour).get_jour_display()} "
                f"{Seance(creneau=creneau).get_creneau_display()}."
            })

        return attrs

    def update(self, instance, validated_data):
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.modifie_manuellement = True
        instance.modifie_le           = timezone.now()
        instance.modifie_par          = self.context['request'].user
        instance.save()
        return instance
