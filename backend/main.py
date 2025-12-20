from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base

# Import models to create tables
from .models import user, group, expense
from .routers import users, groups, expenses, auth, invites

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Expense Sharing App", version="2.0")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(groups.router)
app.include_router(expenses.router)
app.include_router(invites.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Expense Sharing App API"}
