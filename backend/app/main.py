from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router

app = FastAPI(
    title="GADAP Armazém API",
    description="WMS Core, PWA de Doca, Smart Scheduling IA & Blindagem Aduaneira",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
def health_check():
    return {"status": "HEALTHY", "system": "GADAP Armazém WMS", "version": "1.0.0"}

