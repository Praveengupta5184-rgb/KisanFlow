from fastapi import APIRouter
from ..schemas import *
from ..engine import feedback
router=APIRouter(tags=['operations'])
@router.post('/crisis-prediction',response_model=CrisisResponse)
def crisis(r:CrisisRequest):
 last,prev=r.trend[-1],r.trend[-2]; ratio=last.currentLoad/last.capacity; growth=max(0,last.queueCount-prev.queueCount); risk='critical' if ratio>=1 else 'high' if ratio>=.85 else 'medium' if ratio>=.65 else 'low'; minutes=round(max(0,(last.capacity-last.currentLoad)/max(growth,1))*15) if growth else None
 return CrisisResponse(centreId=r.centreId,overloadRisk=risk,timeToOverloadMinutes=minutes,suggestedAction='Open an additional counter' if last.activeCounters<2 else 'Redirect arrivals to the least-loaded nearby centre',redirectFarmerCount=max(0,round(last.currentLoad-last.capacity*.8)))
@router.post('/load-balance',response_model=LoadBalanceResponse)
def balance(r:LoadBalanceRequest):
 high=max(r.centres,key=lambda c:c.currentLoad/c.capacity); low=min(r.centres,key=lambda c:c.currentLoad/c.capacity); n=max(0,min(high.currentLoad-round(high.capacity*.8),round(low.capacity*.8)-low.currentLoad)); return LoadBalanceResponse(transfers=[] if not n else [LoadTransfer(fromCentreId=high.centreId,toCentreId=low.centreId,farmerCount=n,estimatedTimeSavedMinutes=round(n/max(high.processingSpeed,1),1))],explanation='Transfers target 80% utilization at the most loaded centre.')
@router.post('/what-if',response_model=WhatIfResponse)
def what_if(r:WhatIfRequest):
 affected=next(c for c in r.centres if c.centreId==r.affectedCentreId); n=affected.currentLoad if r.scenarioType=='centre_closure' else round(affected.currentLoad*max(r.demandChangePercent,20)/100); others=[c for c in r.centres if c.centreId!=affected.centreId]; weights=[max(c.capacity-c.currentLoad,1) for c in others]; loads={c.centreId:c.currentLoad+round(n*w/sum(weights)) for c,w in zip(others,weights)}; waits={k:round(v/max(next(c.processingSpeed for c in others if c.centreId==k),1)*5,1) for k,v in loads.items()}; return WhatIfResponse(affectedFarmerCount=n,redistributedLoads=loads,estimatedWaitMinutes=waits,summary=f'{r.scenarioType} scenario distributes affected demand by spare capacity.')
@router.post('/payment-delay',response_model=PaymentDelayResponse)
def payment(r:PaymentDelayRequest):
 durations=[(p.paymentReleasedTime-p.completionTime).total_seconds()/3600 for p in r.historicalPayments if p.paymentReleasedTime]; avg=sum(durations)/len(durations) if durations else 48; prob=min(.95,max(.05,(avg-24)/72)); return PaymentDelayResponse(centreId=r.centreId,delayProbability=round(prob,2),delayFlag=prob>=.5,expectedDelayWindowHours=f'{round(avg*.8)}-{round(avg*1.2)} hours',explanation='Based on historical completion-to-release durations.')
@router.post('/bottleneck',response_model=BottleneckResponse)
def bottleneck(r:BottleneckRequest):
 vals={'registration':[],'weighing':[],'qualityCheck':[],'payment':[]}
 for b in r.bookings: vals['registration'].append((b.weighingAt-b.registrationAt).total_seconds()/60);vals['weighing'].append((b.qualityCheckAt-b.weighingAt).total_seconds()/60);vals['qualityCheck'].append((b.paymentAt-b.qualityCheckAt).total_seconds()/60);vals['payment'].append(0)
 avg={k:round(sum(v)/len(v),1) for k,v in vals.items()}; stage=max(avg,key=avg.get);return BottleneckResponse(centreId=r.centreId,bottleneckStage=stage,averageStageMinutes=avg,explanation=f'{stage} has the highest mean stage duration.')
@router.post('/feedback',response_model=FeedbackResponse)
def add_feedback(r:FeedbackPair):
 feedback[r.modelName].append(r);mae=sum(abs(x.predictedValue-x.actualValue) for x in feedback[r.modelName])/len(feedback[r.modelName]);return FeedbackResponse(accepted=True,sampleCount=len(feedback[r.modelName]),meanAbsoluteError=round(mae,3))
