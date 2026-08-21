from rest_framework.decorators import api_view
from rest_framework.response import Response
from .services import get_arima_forecast

@api_view(['GET'])
def forecast_view(request):
    crop = request.GET.get('crop', 'wheat').lower()
    mandi = request.GET.get('mandi', 'pune').lower()
    
    try:
        data = get_arima_forecast(crop, mandi)
        return Response(data)
    except FileNotFoundError as e:
        return Response({"error": str(e)}, status=404)
    except Exception as e:
        return Response({"error": f"Internal Model Error: {str(e)}"}, status=500)