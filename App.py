from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import requests  # Required for Offline Mode

# Import Emotion Detector
try:
    from emotion_detector import detect_emotion
except ImportError:
    def detect_emotion(text): return "neutral"
    
from config import GROQ_API_KEY

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Online Client
client = Groq(api_key=GROQ_API_KEY)

class ChatRequest(BaseModel):
    message: str

# Memory storage
chat_history = []

# --- OFFLINE BRAIN FUNCTION (Ollama) ---
def offline_llm(user_input, emotion):
    print("--- ⚠️ Online failed. Switching to Offline Mode (Ollama) ---")
    try:
        # 1. Prepare the prompt
        system_prompt = (
            f"You are a warm, empathetic AI. The user feels {emotion}. "
            f"Give a short, supportive answer."
        )
        
        # 2. Settings for Ollama
        # Note: If you downloaded 'gemma3:4b', change 'phi3:mini' to that below.
        payload = {
            "model": "phi3:mini",  
            "prompt": f"System: {system_prompt}\nUser: {user_input}\nAI:",
            "stream": False
        }

        # 3. Connect to Ollama
        print("Sending to Ollama...")
        response = requests.post("http://localhost:11434/api/generate", json=payload, timeout=120)
        
        if response.status_code == 200:
            data = response.json()
            return data.get("response", "I'm offline, but I'm here.")
            
    except Exception as e:
        print("Offline Error:", e)
        return "I am offline, and I cannot find the Ollama app running. Please open Ollama."
    
    return "Offline mode error."

@app.post("/chat")
def chat_api(req: ChatRequest):
    user_input = req.message
    
    # 1. Detect Emotion
    emotion = detect_emotion(user_input)
    print(f"User Input: {user_input} | Emotion: {emotion}")

    reply = ""

    # 2. Try ONLINE (Groq) First
    try:
        system_instruction = {
            "role": "system",
            "content": (
                f"You are a warm, empathetic AI companion. User feeling: {emotion}. "
                f"Support them naturally. Keep it short."
            )
        }
        
        # Add history for context
        messages_to_send = [system_instruction] + chat_history + [{"role": "user", "content": user_input}]

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages_to_send,
        )
        reply = response.choices[0].message.content

        # Save to memory
        chat_history.append({"role": "user", "content": user_input})
        chat_history.append({"role": "assistant", "content": reply})
        if len(chat_history) > 10:
            chat_history.pop(0); chat_history.pop(0)

    except Exception as e:
        # 3. If Online FAILS, use OFFLINE
        print(f"Online Error detected ({e})... Activating Offline Brain.")
        reply = offline_llm(user_input, emotion)

    # Return reply AND emotion (for the badge)
    return {"reply": reply, "emotion": emotion}