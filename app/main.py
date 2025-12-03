from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .routers import auth, products, lots, employees, closeouts, exports

Base.metadata.create_all(bind=engine)

app = FastAPI(title="GB API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restringi in produzione
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(products.router, prefix="/products", tags=["Products"])
app.include_router(lots.router, prefix="/lots", tags=["Lots"])
app.include_router(employees.router, prefix="/employees", tags=["Employees"])
app.include_router(closeouts.router, prefix="/closeouts", tags=["Closeouts"])
app.include_router(exports.router, prefix="/exports", tags=["Exports"])

@app.get("/")
def root():
    return {"status": "ok"}
