from datetime import datetime, date
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

class CentreInput(StrictModel):
    centreId: str; distanceKm: float = Field(ge=0); currentQueue: int = Field(ge=0)
    currentLoad: int = Field(ge=0); processingSpeed: float = Field(gt=0); capacity: int = Field(gt=0)

class BestCentreRequest(StrictModel):
    farmerLatitude: float; farmerLongitude: float; centres: list[CentreInput] = Field(min_length=1)
class RankedCentre(StrictModel):
    centreId: str; compositeScore: float; estimatedWaitMinutes: float; estimatedTimeSavedMinutes: float; reason: str
class BestCentreResponse(StrictModel): rankedCentres: list[RankedCentre]

class Snapshot(StrictModel): timestamp: datetime; pendingCount: int = Field(ge=0); processedCount: int = Field(ge=0); activeCounters: int = Field(ge=0)
class WaitPredictionRequest(StrictModel): centreId: str; arrivalTime: datetime; currentLoad: int = Field(ge=0); snapshots: list[Snapshot] = Field(min_length=1)
class WaitPredictionResponse(StrictModel): centreId: str; predictedWaitMinutes: float; confidenceScore: float; explanation: list[str]

class ArrivalPoint(StrictModel): timestamp: datetime; arrivalCount: int = Field(ge=0); cropSeasonFactor: float = Field(default=1, ge=0.1, le=5)
class DemandForecastRequest(StrictModel): centreId: str; arrivals: list[ArrivalPoint] = Field(min_length=3); forecastHours: int = Field(default=24, ge=1, le=168)
class DemandForecastResponse(StrictModel): centreId: str; forecastedFarmerCount: int; congestionRisk: Literal['low','medium','high']; explanation: str
class HarvestRushRequest(StrictModel): cropName: str; volumes: list[ArrivalPoint] = Field(min_length=3)
class HarvestRushResponse(StrictModel): cropName: str; expectedIncreasePercent: float; spikeStartDate: date; spikeEndDate: date; explanation: str

class OverloadPoint(StrictModel): timestamp: datetime; currentLoad: int = Field(ge=0); capacity: int = Field(gt=0); queueCount: int = Field(ge=0); activeCounters: int = Field(ge=0)
class CrisisRequest(StrictModel): centreId: str; trend: list[OverloadPoint] = Field(min_length=2); alternateCentres: list[CentreInput] = []
class CrisisResponse(StrictModel): centreId: str; overloadRisk: Literal['low','medium','high','critical']; timeToOverloadMinutes: int | None; suggestedAction: str; redirectFarmerCount: int
class LoadBalanceRequest(StrictModel): centres: list[CentreInput] = Field(min_length=2)
class LoadTransfer(StrictModel): fromCentreId: str; toCentreId: str; farmerCount: int; estimatedTimeSavedMinutes: float
class LoadBalanceResponse(StrictModel): transfers: list[LoadTransfer]; explanation: str
class WhatIfRequest(StrictModel): scenarioType: Literal['centre_closure','staff_unavailable','demand_increase','equipment_failure']; affectedCentreId: str; demandChangePercent: float = 0; centres: list[CentreInput] = Field(min_length=1)
class WhatIfResponse(StrictModel): affectedFarmerCount: int; redistributedLoads: dict[str,int]; estimatedWaitMinutes: dict[str,float]; summary: str

class PaymentHistory(StrictModel): completionTime: datetime; paymentReleasedTime: datetime | None = None
class PaymentDelayRequest(StrictModel): centreId: str; procurementCompletionTime: datetime; historicalPayments: list[PaymentHistory] = Field(min_length=1)
class PaymentDelayResponse(StrictModel): centreId: str; delayProbability: float; delayFlag: bool; expectedDelayWindowHours: str; explanation: str
class BookingStage(StrictModel): bookingId: str; registrationAt: datetime; weighingAt: datetime; qualityCheckAt: datetime; paymentAt: datetime
class BottleneckRequest(StrictModel): centreId: str; bookings: list[BookingStage] = Field(min_length=1)
class BottleneckResponse(StrictModel): centreId: str; bottleneckStage: str; averageStageMinutes: dict[str,float]; explanation: str
class FeedbackPair(StrictModel): modelName: Literal['waitTime','demand']; predictedValue: float; actualValue: float; recordedAt: datetime
class FeedbackResponse(StrictModel): accepted: bool; sampleCount: int; meanAbsoluteError: float
class QueueAnomalyRequest(StrictModel): centreId: str; physicalQueueCount: int = Field(ge=0); digitalQueueCount: int = Field(ge=0); threshold: int = Field(default=5, ge=1)
class QueueAnomalyResponse(StrictModel): centreId: str; physicalQueueCount: int; digitalQueueCount: int; difference: int; anomalyFlag: bool; description: str
class CropQualityResponse(StrictModel): riskLevel: Literal['low','medium','high']; confidenceScore: float; reasoningTags: list[str]; disclaimer: str
class ChatbotRequest(StrictModel): query: str; language: str = 'en'; farmerMobile: str | None = None; context: dict | None = None
class ChatbotResponse(StrictModel): reply: str; source: str = 'ai'
class QueueCountResponse(StrictModel): physicalQueueCount: int; detector: str; note: str
