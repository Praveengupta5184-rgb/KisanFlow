# KisanFlow AI service

Run with `python -m pip install -r requirements.txt` then `uvicorn app.main:app --reload --port 8000`.
Interactive request/response examples for every endpoint are available at `/docs`. All API fields are camelCase for Spring Boot integration.

Key routes: `POST /api/v1/best-centre`, `/wait-time`, `/demand-forecast`, `/harvest-rush`, `/crisis-prediction`, `/load-balance`, `/what-if`, `/payment-delay`, `/bottleneck`, `/feedback`, `/queue-anomaly`, `/queue-count`, and `/crop-pre-screen`.

`python scripts/generate_sample_data.py` creates CSV files under `demo-data/` for a local demo. The vision routes use OpenCV HOG and a colour/texture heuristic in safe demo mode; the quality response always states that it is non-authoritative.
