"""Serializer des indisponibilités enseignants."""

from rest_framework import serializers

from core.models import IndisponibiliteEnseignant


class IndisponibiliteSerializer(serializers.ModelSerializer):
    enseignant_nom  = serializers.CharField(source='enseignant.nom', read_only=True)
    jour_display    = serializers.CharField(source='get_jour_display', read_only=True)
    creneau_display = serializers.SerializerMethodField()

    class Meta:
        model  = IndisponibiliteEnseignant
        fields = (
            'id', 'enseignant', 'enseignant_nom',
            'type', 'jour', 'jour_display',
            'creneau', 'creneau_display',
            'semaine', 'motif', 'cree_le',
        )
        read_only_fields = ('id', 'enseignant_nom', 'jour_display', 'creneau_display', 'cree_le')
        extra_kwargs = {'type': {'required': False}}

    def get_creneau_display(self, obj):
        return obj.get_creneau_display() if obj.creneau is not None else 'Journée entière'
