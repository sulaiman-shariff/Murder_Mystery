from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import os

app = FastAPI()

# ✅ Enable CORS so frontend can access the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or specify ["http://localhost:3000"] for tighter security
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Pydantic schema for incoming JSON data
class GameStats(BaseModel):
    playerName: str
    mysteryId: int
    timeTaken: int

class PlayerStart(BaseModel):
    playerName: str

# ✅ Middleware to log every request
@app.middleware("http")
async def log_requests(request: Request, call_next):
    body = await request.body()
    print("\n📥 Incoming Request:")
    print(f"➡️  Method: {request.method}")
    print(f"📍 Path: {request.url.path}")
    print(f"📦 Body: {body.decode('utf-8')}")
    response = await call_next(request)
    return response

# ✅ Route for saving Game 2 stats
@app.post("/store_stats")
async def store_stats(data: GameStats):
    return save_to_excel(data, "Stats stored for Game 2.")

# ✅ Route for saving Game 3 stats
@app.post("/save-stats")
async def save_stats(data: GameStats):
    return save_to_excel(data, "Final stats saved for Game 3.")

# ✅ Route to log name and start game (new)
@app.post("/start_game")
async def start_game(data: PlayerStart):
    print(f"🎮 Game started by: {data.playerName}")

    # Save initial record to Excel (mysteryId=0, timeTaken=0)
    dummy_data = GameStats(playerName=data.playerName, mysteryId=0, timeTaken=0)
    save_to_excel(dummy_data, "Player started the game.")

    return JSONResponse(content={"message": f"Welcome, {data.playerName}!"})

# ✅ Route to store failed attempts (timeTaken=0 but mysteryId remains correct)
@app.post("/store_failed_attempt")
async def store_failed_attempt(data: GameStats):
    data.timeTaken = 0  # Only time is zero; mysteryId stays valid
    return save_to_excel(data, "Incorrect guess logged (Time = 0).")

# ✅ Common function to save to Excel
def save_to_excel(data: GameStats, message: str):
    df = pd.DataFrame([{
        "Player Name": data.playerName,
        "Mystery ID": data.mysteryId,
        "Time Taken (s)": data.timeTaken
    }])

    if not os.path.exists("game_stats.xlsx"):
        df.to_excel("game_stats.xlsx", index=False)
    else:
        existing_df = pd.read_excel("game_stats.xlsx")
        updated_df = pd.concat([existing_df, df], ignore_index=True)
        updated_df.to_excel("game_stats.xlsx", index=False)

    return JSONResponse(content={"message": message})
