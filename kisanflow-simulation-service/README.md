# KisanFlow What-If Simulation Service

Install and run:

```powershell
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8100
```

`POST /api/v1/simulate` uses an explainable M/M/c approximation. Inputs reject unknown fields, missing centres, zero staff/counters, and invalid scenario combinations with HTTP 422. All API payload keys are camelCase. Interactive API documentation is available at `/docs`.

## Example requests

All examples use this centre list (replace `scenarioType` fields as shown):

```json
{"centres":[{"centreId":"A","currentLoad":120,"capacity":200,"staffCount":6,"activeCounters":3,"processingSpeed":10,"distanceKm":0},{"centreId":"B","currentLoad":50,"capacity":180,"staffCount":5,"activeCounters":2,"processingSpeed":9,"distanceKm":8}],"affectedCentreId":"A"}
```

Centre closure: append `"scenarioType":"centreClosure"`. The response includes `affectedFarmerCount`, `redistributionBreakdown`, each centre's `estimatedWaitMinutes`, and a display-ready `summary`.

Demand increase: append `"scenarioType":"demandIncrease","demandIncreasePercent":35`. All centre loads are increased before the wait-time calculation.

Staff/counter outage: append `"scenarioType":"staffUnavailable","unavailableCounters":2`. The affected centre retains at least one counter; an invalid zero-counter input is rejected by validation.

Equipment failure: append `"scenarioType":"equipmentFailure","equipmentCapacityReductionPercent":45`. This reduces effective processing speed and computes the cascading queue effect.

Officer plan:

```json
{"scenarioType":"officerPlan","centres":[{"centreId":"A","currentLoad":0,"capacity":600,"staffCount":6,"activeCounters":3,"processingSpeed":10,"distanceKm":0}],"expectedFarmers":500,"officerCounters":3,"officerStaff":8}
```

Its response includes `officerPlanComparison`, e.g. `officerWaitMinutes`, `aiOptimalWaitMinutes`, `aiOptimalCounters`, `aiOptimalStaff`, and `improvementMinutes`.

For horizontal production scaling, keep the service stateless and persist submitted scenarios/results externally. The calculation itself is deterministic and inexpensive; a queue worker is only necessary for large Monte-Carlo extensions.
