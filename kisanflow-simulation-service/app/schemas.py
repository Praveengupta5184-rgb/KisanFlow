from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

class StrictModel(BaseModel): model_config=ConfigDict(extra='forbid')
class CentreState(StrictModel):
    centreId: str
    currentLoad: int = Field(ge=0, description='Farmers currently in the queue')
    capacity: int = Field(gt=0)
    staffCount: int = Field(gt=0)
    activeCounters: int = Field(gt=0)
    processingSpeed: float = Field(gt=0, description='Farmers processed per counter per hour')
    distanceKm: float = Field(default=0, ge=0)
class SimulationRequest(StrictModel):
    scenarioType: Literal['centreClosure','demandIncrease','staffUnavailable','equipmentFailure','officerPlan']
    affectedCentreId: str | None = None
    centres: list[CentreState] = Field(min_length=1)
    demandIncreasePercent: float = Field(default=0, ge=0, le=500)
    unavailableCounters: int = Field(default=0, ge=0)
    equipmentCapacityReductionPercent: float = Field(default=0, ge=0, le=100)
    expectedFarmers: int | None = Field(default=None, ge=0)
    officerCounters: int | None = Field(default=None, ge=1)
    officerStaff: int | None = Field(default=None, ge=1)
    @model_validator(mode='after')
    def validate_scenario(self):
        ids={c.centreId for c in self.centres}
        if self.scenarioType != 'officerPlan' and self.affectedCentreId not in ids: raise ValueError('affectedCentreId must identify a supplied centre')
        if self.scenarioType=='officerPlan' and (self.expectedFarmers is None or self.officerCounters is None or self.officerStaff is None): raise ValueError('officerPlan requires expectedFarmers, officerCounters, and officerStaff')
        return self
class CentreImpact(StrictModel):
    centreId: str; originalLoad: int; newLoad: int; effectiveCounters: int; utilization: float; estimatedWaitMinutes: float; overloadRisk: Literal['low','medium','high','critical']
class PlanComparison(StrictModel): officerWaitMinutes: float; aiOptimalWaitMinutes: float; aiOptimalCounters: int; aiOptimalStaff: int; improvementMinutes: float
class SimulationResponse(StrictModel):
    scenarioType: str; affectedFarmerCount: int; redistributionBreakdown: dict[str,int]; centreImpacts: list[CentreImpact]; officerPlanComparison: PlanComparison | None = None; summary: str
