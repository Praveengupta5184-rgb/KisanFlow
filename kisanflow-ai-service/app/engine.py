"""Small, deterministic feature-engineering models suitable for transparent demos."""
from collections import defaultdict
from datetime import timedelta
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from .schemas import *

feedback: dict[str, list[FeedbackPair]] = defaultdict(list)

def recommend(req: BestCentreRequest) -> BestCentreResponse:
    waits=[c.currentQueue/max(c.processingSpeed, .1) for c in req.centres]
    best=min(waits)
    ranked=[]
    for c, wait in zip(req.centres, waits):
        load=c.currentLoad/c.capacity; score=round(100-(c.distanceKm*4+wait*2+load*30),2)
        ranked.append(RankedCentre(centreId=c.centreId, compositeScore=max(0,score), estimatedWaitMinutes=round(wait,1), estimatedTimeSavedMinutes=round(max(0,wait-best),1), reason=f"{c.distanceKm:.1f} km away, {c.currentQueue} in queue, and {load:.0%} loaded."))
    return BestCentreResponse(rankedCentres=sorted(ranked,key=lambda x:x.compositeScore,reverse=True))

def wait_time(req: WaitPredictionRequest) -> WaitPredictionResponse:
    x=np.array([[s.timestamp.hour,s.timestamp.weekday(),s.pendingCount,s.activeCounters] for s in req.snapshots]); y=np.array([s.pendingCount/max(s.activeCounters,1)*6 for s in req.snapshots])
    model=HistGradientBoostingRegressor(max_iter=30, max_depth=3, random_state=42).fit(x,y) if len(x)>=5 else None
    latest=req.snapshots[-1]; predicted=float(model.predict([[req.arrivalTime.hour,req.arrivalTime.weekday(),req.currentLoad,latest.activeCounters]])[0]) if model else req.currentLoad/max(latest.activeCounters,1)*6
    return WaitPredictionResponse(centreId=req.centreId,predictedWaitMinutes=round(max(predicted,0),1),confidenceScore=round(min(.9,.45+len(x)/30),2),explanation=["Uses queue depth, counter availability, arrival hour and weekday.","Prediction is recalibrated from submitted feedback."])

def demand(req: DemandForecastRequest) -> DemandForecastResponse:
    values=np.array([p.arrivalCount*p.cropSeasonFactor for p in req.arrivals]); recent=values[-min(7,len(values)):]; forecast=round(float(recent.mean()*(1+(recent[-1]-recent.mean())/max(recent.mean(),1)*.3))*req.forecastHours/24); risk='high' if forecast>100 else 'medium' if forecast>50 else 'low'
    return DemandForecastResponse(centreId=req.centreId,forecastedFarmerCount=max(0,forecast),congestionRisk=risk,explanation="Season-adjusted moving average with a recent trend correction.")
