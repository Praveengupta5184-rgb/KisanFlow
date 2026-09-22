from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import recommendations, forecasting, operations, vision, chatbot
app=FastAPI(title='KisanFlow AI Engine',version='1.0.0',description='Explainable procurement prediction and CV service.')
app.add_middleware(CORSMiddleware,allow_origins=['*'],allow_methods=['*'],allow_headers=['*'])
for router in (recommendations.router,forecasting.router,operations.router,vision.router,chatbot.router): app.include_router(router,prefix='/api/v1')
@app.get('/health')
def health(): return {'status':'up','service':'kisanflow-ai'}
