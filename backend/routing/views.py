from rest_framework.decorators import api_view
from rest_framework.response import Response
from .services import get_routing_data, get_mock_roadmap

@api_view(['GET'])
def routing_view(request):
    crop = request.GET.get('crop', 'wheat')
    try:
        quintals = float(request.GET.get('quintals', 50))
    except ValueError:
        quintals = 50.0
    location = request.GET.get('location', 'pune')
    
    data = get_routing_data(crop, quintals, location)
    return Response(data)

@api_view(['GET'])
def roadmap_view(request):
    crop = request.GET.get('crop', 'wheat')
    location = request.GET.get('location', 'pune')
    data = get_mock_roadmap(crop, location)
    return Response(data)