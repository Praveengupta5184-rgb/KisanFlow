from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import SimulationRequest, SimulationResponse
from .engine import simulate
app=FastAPI(title='KisanFlow Simulation Engine',version='1.0.0')
app.add_middleware(CORSMiddleware,allow_origins=['*'],allow_methods=['*'],allow_headers=['*'])
@app.get('/health')
def health(): return {'status':'up','service':'kisanflow-simulation'}
@app.post('/api/v1/simulate',response_model=SimulationResponse)
def run(request:SimulationRequest):
    try:return simulate(request)
    except ValueError as exc: raise HTTPException(status_code=422,detail=str(exc))
