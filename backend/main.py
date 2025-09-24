from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.oauth2 import id_token as google_id_token # type: ignore
from google.auth.transport import requests as google_requests # type: ignore
from jose import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os

# Cargar variables de entorno desde .env
load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALG = "HS256"
print(GOOGLE_CLIENT_ID)
app = FastAPI()

# Permitir CORS para que Ionic pueda llamar al backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8100"],  # origen de tu Ionic dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model para recibir el id_token
class TokenIn(BaseModel):
    id_token: str

@app.post("/auth/google")
def auth_google(payload: TokenIn, response: Response):
    try:
        # Verificar id_token con Google
        idinfo = google_id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
        # Validar issuer
        if idinfo.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
            raise ValueError("Issuer inválido")
    except ValueError:
        raise HTTPException(status_code=400, detail="Token de Google inválido")

    # Extraer datos del usuario
    user_id = idinfo["sub"]
    email = idinfo.get("email")
    name = idinfo.get("name")

    # Crear JWT propio
    payload_jwt = {
        "sub": user_id,
        "email": email,
        "name": name,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    token = jwt.encode(payload_jwt, JWT_SECRET, algorithm=JWT_ALG)

    # Opcional: enviar cookie
    response.set_cookie("access_token", token, httponly=True, secure=False, samesite="lax")

    return {"ok": True, "token": token, "user": {"id": user_id, "email": email, "name": name}}

# Ruta de prueba opcional
@app.get("/")
def read_root():
    return {"message": "Backend Sunity listo para Google Login"}
