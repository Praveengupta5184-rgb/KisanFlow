from datetime import datetime
from app.engine import recommend
from app.schemas import BestCentreRequest

def test_best_centre_prefers_low_wait_time():
    request=BestCentreRequest(farmerLatitude=0,farmerLongitude=0,centres=[{'centreId':'slow','distanceKm':1,'currentQueue':100,'currentLoad':90,'processingSpeed':5,'capacity':100},{'centreId':'fast','distanceKm':3,'currentQueue':5,'currentLoad':10,'processingSpeed':10,'capacity':100}])
    assert recommend(request).rankedCentres[0].centreId == 'fast'
