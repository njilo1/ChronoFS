from django.urls import path
from .views import GenerationView

urlpatterns = [
    path('emplois/generer/', GenerationView.as_view(), name='emplois-generer'),
]
