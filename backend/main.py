from fastapi import FastAPI, HTTPException, Response, Cookie, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.oauth2 import id_token as google_id_token  # type: ignore
from google.auth.transport import requests as google_requests  # type: ignore
from jose import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
from bd import get_connection
from fastapi.staticfiles import StaticFiles
import shutil


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

    first_login = False
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Usar google_id como identificador, no id
        cur.execute("SELECT google_id FROM usuarios WHERE google_id = %s", (user_id,))
        existe = cur.fetchone()

        if not existe:
            # No existe → insertar (sin foto_perfil)
            cur.execute(
                """
                INSERT INTO usuarios (google_id, email, nombre)
                VALUES (%s, %s, %s)
                """,
                (user_id, email, name)
            )
            conn.commit()
            first_login = True  # 🚩 Es el primer login

        cur.close()
        conn.close()
    except Exception as e:
        print("Error guardando usuario:", e)
        raise HTTPException(status_code=500, detail="Error interno guardando usuario")

    # Crear JWT propio (sin picture)
    payload_jwt = {
        "sub": user_id,
        "email": email,
        "name": name,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    token = jwt.encode(payload_jwt, JWT_SECRET, algorithm=JWT_ALG)

    response.set_cookie("access_token", token, httponly=True, secure=False, samesite="lax")

    return {
        "ok": True,
        "firstLogin": first_login,
        "token": token,
        "user": {"id": user_id, "email": email, "name": name}
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
    return {"user": {"id": payload["sub"], "email": payload["email"], "name": payload["name"]}}

# Cerrar sesión borrando la cookie
@app.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"ok": True, "message": "Sesión cerrada"}


class UpdateProfile(BaseModel):
    comuna: str
    region: str
    telefono: str


@app.post("/profile/update")
def update_profile(data: UpdateProfile, access_token: str = Cookie(None)):
    if not access_token:
        raise HTTPException(status_code=401, detail="No autorizado")
    
    try:
        payload = jwt.decode(access_token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE usuarios
            SET comuna = %s,
                region = %s,
                telefono = %s
            WHERE google_id = %s
            """,
            (data.comuna, data.region, data.telefono, user_id)
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print("Error actualizando usuario:", e)
        raise HTTPException(status_code=500, detail="Error interno actualizando usuario")
    
    return {"ok": True, "message": "Perfil actualizado"}



# Montar la carpeta 'uploads' para servir archivos estáticos
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.post("/profile/upload-photo")
def upload_profile_photo(file: UploadFile = File(...), access_token: str = Cookie(None)):
    if not access_token:
        raise HTTPException(status_code=401, detail="No autorizado")
    
    try:
        payload = jwt.decode(access_token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload["sub"]
        email = payload["email"]  # extraemos el correo para el nombre del archivo
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    # Validar tipo de archivo
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Formato de imagen no soportado")
    
    # Crear nombre de archivo significativo con correo y fecha
    fecha = datetime.now().strftime("%Y%m%d%H%M%S")  # AAAAMMDDHHMMSS
    extension = file.filename.split(".")[-1]  # mantener extensión original
    safe_email = email.replace("@", "_").replace(".", "_")  # caracteres seguros
    filename = f"{safe_email}_{fecha}.{extension}"
    
    file_path = os.path.join("uploads", filename)
    
    # Guardar archivo
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # URL accesible desde el servidor
    file_url = f"/uploads/{filename}"
    
    # Guardar URL en base de datos
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "UPDATE usuarios SET foto_perfil = %s WHERE google_id = %s",
            (file_url, user_id)
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print("Error actualizando foto de perfil:", e)
        raise HTTPException(status_code=500, detail="Error interno guardando la foto")
    
    return {"ok": True, "message": "Foto subida exitosamente", "url": file_url}