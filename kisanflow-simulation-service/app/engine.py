"""Explainable M/M/c/K approximation with greedy spare-capacity redistribution."""
from math import factorial
from .schemas import *

def mmc_wait_minutes(load:int, counters:int, service_per_counter:float) -> tuple[float,float]:
    """Return queue wait and utilisation. Guards unstable and zero-service systems."""
    if counters <= 0 or service_per_counter <= 0: raise ValueError('active counters and processing speed must be greater than zero')
    arrival_rate=max(load/8, .01) # expected arrivals/hour over an eight-hour procurement day
    mu=service_per_counter; c=counters; rho=arrival_rate/(c*mu)
    if rho >= 1: return (round(60*(30+(rho-1)*240),1),rho) # finite dashboard approximation for overload
    a=arrival_rate/mu
    p0=1/(sum(a**n/factorial(n) for n in range(c)) + a**c/factorial(c)/(1-rho))
    pw=(a**c/factorial(c)/(1-rho))*p0
    return (round(60*pw/(c*mu-arrival_rate),1),rho)

def simulate(r:SimulationRequest) -> SimulationResponse:
    centres={c.centreId:c.model_copy() for c in r.centres}; affected=centres.get(r.affectedCentreId) if r.affectedCentreId else None; redistribute=0
    if r.scenarioType=='centreClosure': redistribute=affected.currentLoad; affected.currentLoad=0; affected.activeCounters=1
    elif r.scenarioType=='demandIncrease':
        for c in centres.values(): c.currentLoad+=round(c.currentLoad*r.demandIncreasePercent/100)
    elif r.scenarioType=='staffUnavailable': affected.activeCounters=max(1,affected.activeCounters-r.unavailableCounters); affected.staffCount=max(1,affected.staffCount-r.unavailableCounters)
    elif r.scenarioType=='equipmentFailure': affected.processingSpeed*=max(0.05,1-r.equipmentCapacityReductionPercent/100)
    if redistribute:
        targets=[c for c in centres.values() if c.centreId!=affected.centreId]
        if not targets: raise ValueError('centre closure requires at least one alternate centre')
        weights=[max(1,c.capacity-c.currentLoad)/(1+c.distanceKm*.1) for c in targets]
        for c,w in zip(targets,weights): c.currentLoad+=round(redistribute*w/sum(weights))
    impacts=[]
    for original,c in zip(r.centres,centres.values()):
        wait,rho=mmc_wait_minutes(c.currentLoad,c.activeCounters,c.processingSpeed);risk='critical' if rho>=1 else 'high' if rho>.85 else 'medium' if rho>.65 else 'low'
        impacts.append(CentreImpact(centreId=c.centreId,originalLoad=original.currentLoad,newLoad=c.currentLoad,effectiveCounters=c.activeCounters,utilization=round(rho,2),estimatedWaitMinutes=wait,overloadRisk=risk))
    breakdown={i.centreId:i.newLoad-next(c.currentLoad for c in r.centres if c.centreId==i.centreId) for i in impacts if i.newLoad>next(c.currentLoad for c in r.centres if c.centreId==i.centreId)}
    comparison=None
    if r.scenarioType=='officerPlan':
        c=r.centres[0]; officer,_=mmc_wait_minutes(r.expectedFarmers,r.officerCounters,c.processingSpeed); best=(officer,r.officerCounters,r.officerStaff)
        for counters in range(1,11):
            for staff in range(counters,21):
                wait,_=mmc_wait_minutes(r.expectedFarmers,counters,c.processingSpeed*(1+max(staff-counters,0)*.03))
                if wait<best[0]:best=(wait,counters,staff)
        comparison=PlanComparison(officerWaitMinutes=officer,aiOptimalWaitMinutes=best[0],aiOptimalCounters=best[1],aiOptimalStaff=best[2],improvementMinutes=round(officer-best[0],1))
    return SimulationResponse(scenarioType=r.scenarioType,affectedFarmerCount=redistribute or (round(sum(c.currentLoad for c in r.centres)*r.demandIncreasePercent/100) if r.scenarioType=='demandIncrease' else 0),redistributionBreakdown=breakdown,centreImpacts=impacts,officerPlanComparison=comparison,summary=summary(r,impacts,comparison))

def summary(r,impacts,comparison):
    worst=max(impacts,key=lambda x:x.estimatedWaitMinutes)
    if comparison:return f'Officer plan waits {comparison.officerWaitMinutes:.0f} minutes; the greedy resource search estimates {comparison.aiOptimalWaitMinutes:.0f} minutes with {comparison.aiOptimalCounters} counters.'
    return f'{r.scenarioType} simulation completed. {worst.centreId} has the highest estimated wait at {worst.estimatedWaitMinutes:.0f} minutes.'
