from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.oauth2 import id_token as google_id_token  # type: ignore
from google.auth.transport import requests as google_requests  # type: ignore
from jose import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
from fastapi import Cookie
from bd import get_connection

# Cargar variables de entorno desde .env
load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALG = "HS256"

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
        idinfo = google_id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
        if idinfo.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
            raise ValueError("Issuer inválido")
    except ValueError:
        raise HTTPException(status_code=400, detail="Token de Google inválido")

    user_id = idinfo["sub"]
    email = idinfo.get("email")
    name = idinfo.get("name")
    foto_perfil = idinfo.get("picture")

    first_login = False
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Usar google_id como identificador, no id
        cur.execute("SELECT google_id FROM usuarios WHERE google_id = %s", (user_id,))
        existe = cur.fetchone()

        if not existe:
            # No existe → insertar
            cur.execute(
                """
                INSERT INTO usuarios (google_id, email, nombre, foto_perfil)
                VALUES (%s, %s, %s, %s)
                """,
                (user_id, email, name, foto_perfil)
            )
            conn.commit()
            first_login = True  # 🚩 Es el primer login

        cur.close()
        conn.close()
    except Exception as e:
        print("Error guardando usuario:", e)
        raise HTTPException(status_code=500, detail="Error interno guardando usuario")

    # Crear JWT propio
    payload_jwt = {
        "sub": user_id,
        "email": email,
        "name": name,
        "picture": foto_perfil,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    token = jwt.encode(payload_jwt, JWT_SECRET, algorithm=JWT_ALG)

    response.set_cookie("access_token", token, httponly=True, secure=False, samesite="lax")

    return {
        "ok": True,
        "firstLogin": first_login,
        "token": token,
        "user": {"id": user_id, "email": email, "name": name, "picture": foto_perfil}
    }

# Ruta para obtener los datos del usuario a partir de la cookie
@app.get("/profile")
def get_profile(access_token: str = Cookie(None)):
    if not access_token:
        raise HTTPException(status_code=401, detail="No autorizado")
    try:
        payload = jwt.decode(access_token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")
    return {"user": {"id": payload["sub"], "email": payload["email"], "name": payload["name"], "picture": payload.get("picture")}}

# Cerrar sesión borrando la cookie
@app.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"ok": True, "message": "Sesión cerrada"}
