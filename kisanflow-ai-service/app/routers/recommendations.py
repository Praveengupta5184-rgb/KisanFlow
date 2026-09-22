from fastapi import APIRouter
from ..schemas import *
from ..engine import recommend, wait_time
router=APIRouter(tags=['recommendations'])
@router.post('/best-centre',response_model=BestCentreResponse)
def best_centre(request:BestCentreRequest): return recommend(request)
@router.post('/wait-time',response_model=WaitPredictionResponse)
def predict_wait_time(request:WaitPredictionRequest): return wait_time(request)
