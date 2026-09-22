from datetime import timedelta
import numpy as np
from fastapi import APIRouter
from ..schemas import *
from ..engine import demand
router=APIRouter(tags=['forecasting'])
@router.post('/demand-forecast',response_model=DemandForecastResponse)
def forecast(request:DemandForecastRequest): return demand(request)
@router.post('/harvest-rush',response_model=HarvestRushResponse)
def harvest(request:HarvestRushRequest):
 values=np.array([v.arrivalCount*v.cropSeasonFactor for v in request.volumes]); base=max(values[:-1].mean(),1); increase=(values[-1]/base-1)*100; start=request.volumes[-1].timestamp.date()
 return HarvestRushResponse(cropName=request.cropName,expectedIncreasePercent=round(float(increase),1),spikeStartDate=start,spikeEndDate=start+timedelta(days=7),explanation='Recent season-adjusted volume compared with the earlier baseline.')
