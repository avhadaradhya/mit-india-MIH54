from django.urls import path
from .views import routing_view, roadmap_view

urlpatterns = [
    path('', routing_view, name='routing'),
    path('roadmap/', roadmap_view, name='roadmap'), # Added to fulfill frontend needs
]