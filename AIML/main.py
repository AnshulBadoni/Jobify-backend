from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends
import uvicorn
# from db.connection import get_db

from controllers.profile import profile
from controllers.practice import practice
from controllers.job_match import vector
from controllers.pollination import pollination
from controllers.uncensored import register_events, uncensored
from grpc_server import create_grpc_server

app = FastAPI(title="AIML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def status():
    return {"status": "AIML service is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

app.include_router(pollination)
app.include_router(uncensored)
app.include_router(profile)
app.include_router(practice)
app.include_router(vector)

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": exc.detail, "status_code": exc.status_code},
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"success": False, "error": "Internal server error", "detail": str(exc)},
    )

register_events(app)

# Store grpc server in app.state so we can stop it later
@app.on_event("startup")
async def on_startup():
    print("🚀 FastAPI starting...")
    print("🚀 gRPC server starting...")
    app.state.grpc_server = create_grpc_server()
    await app.state.grpc_server.start()

@app.on_event("shutdown")
async def on_shutdown():
    print("🛑 Shutting down both FastAPI and gRPC...")
    await app.state.grpc_server.stop(0)

def serve():
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=False, log_level="info")

if __name__ == "__main__":
    serve()