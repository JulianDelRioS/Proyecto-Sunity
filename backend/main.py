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

# =========================================
# CARGA DE VARIABLES DE ENTORNO
# =========================================
load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALG = "HS256"

# =========================================
# INICIALIZACIÓN DE LA APP FASTAPI
# =========================================
app = FastAPI()

# Configuración de CORS para Ionic
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8100"],  # Origen del dev server de Ionic
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================
# MODELOS DE Pydantic
# =========================================
class TokenIn(BaseModel):
    """Modelo para recibir id_token desde el frontend."""
    id_token: str

class UpdateProfile(BaseModel):
    """Modelo para actualizar datos de usuario."""
    comuna: str
    region: str
    telefono: str

# =========================================
# RUTAS DE AUTENTICACIÓN
# =========================================
@app.post("/auth/google")
def auth_google(payload: TokenIn, response: Response):
    """
    Autenticación con Google OAuth.
    - Verifica el id_token de Google
    - Inserta el usuario si es la primera vez
    - Genera JWT propio y lo retorna en cookie
    """
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

        # Verificar si el usuario ya existe
        cur.execute("SELECT google_id FROM usuarios WHERE google_id = %s", (user_id,))
        existe = cur.fetchone()

        if not existe:
            # Insertar usuario por primera vez (sin foto_perfil)
            cur.execute(
                """
                INSERT INTO usuarios (google_id, email, nombre)
                VALUES (%s, %s, %s)
                """,
                (user_id, email, name)
            )
            conn.commit()
            first_login = True

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

@app.get("/profile")
def get_profile(access_token: str = Cookie(None)):
    """
    Obtiene los datos básicos del usuario (id, email, name) a partir del JWT en la cookie.
    """
    if not access_token:
        raise HTTPException(status_code=401, detail="No autorizado")
    try:
        payload = jwt.decode(access_token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")
    return {"user": {"id": payload["sub"], "email": payload["email"], "name": payload["name"]}}

@app.post("/logout")
def logout(response: Response):
    """
    Cierra sesión borrando la cookie 'access_token'.
    """
    response.delete_cookie("access_token")
    return {"ok": True, "message": "Sesión cerrada"}

# =========================================
# RUTAS DE PERFIL
# =========================================
@app.post("/profile/update")
def update_profile(data: UpdateProfile, access_token: str = Cookie(None)):
    """
    Actualiza los datos de perfil del usuario (comuna, region, telefono)
    usando su JWT para identificarlo.
    """
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

# =========================================
# RUTAS DE SUBIDA DE FOTOS
# =========================================
# Montar la carpeta 'uploads' para servir archivos estáticos
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.post("/profile/upload-photo")
def upload_profile_photo(file: UploadFile = File(...), access_token: str = Cookie(None)):
    """
    Sube foto de perfil del usuario:
    - Valida tipo de archivo (jpeg, png, webp)
    - Guarda la imagen en /uploads
    - Actualiza la URL en la base de datos
    """
    if not access_token:
        raise HTTPException(status_code=401, detail="No autorizado")
    
    try:
        payload = jwt.decode(access_token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload["sub"]
        email = payload["email"]
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    # Validar tipo de archivo
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Formato de imagen no soportado")
    
    # Crear nombre de archivo seguro
    fecha = datetime.now().strftime("%Y%m%d%H%M%S")
    extension = file.filename.split(".")[-1]
    safe_email = email.replace("@", "_").replace(".", "_")
    filename = f"{safe_email}_{fecha}.{extension}"
    
    file_path = os.path.join("uploads", filename)
    
    # Guardar archivo
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # URL accesible
    file_url = f"/uploads/{filename}"
    
    # Guardar URL en la base de datos
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

# =========================================
# RUTA DETALLES COMPLETOS DEL PERFIL
# =========================================

def get_user_data(user_id: str):
    """Función helper para obtener los datos del usuario desde la DB"""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT foto_perfil, region, comuna, telefono
            FROM usuarios
            WHERE google_id = %s
            """,
            (user_id,)
        )
        result = cur.fetchone()
        cur.close()
        conn.close()
        return result
    except Exception as e:
        print("Error obteniendo datos del usuario:", e)
        raise HTTPException(status_code=500, detail="Error interno obteniendo perfil")

def verify_token(access_token: str):
    """Decodifica el JWT y devuelve el google_id"""
    if not access_token:
        raise HTTPException(status_code=401, detail="No autorizado")
    try:
        payload = jwt.decode(access_token, JWT_SECRET, algorithms=[JWT_ALG])
        return payload["sub"].strip()
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/profile/foto")
def get_foto(access_token: str = Cookie(None)):
    user_id = verify_token(access_token)
    data = get_user_data(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"foto_perfil": data["foto_perfil"]}

@app.get("/profile/region")
def get_region(access_token: str = Cookie(None)):
    user_id = verify_token(access_token)
    data = get_user_data(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"region": data["region"]}

@app.get("/profile/comuna")
def get_comuna(access_token: str = Cookie(None)):
    user_id = verify_token(access_token)
    data = get_user_data(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"comuna": data["comuna"]}

@app.get("/profile/telefono")
def get_telefono(access_token: str = Cookie(None)):
    user_id = verify_token(access_token)
    data = get_user_data(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"telefono": data["telefono"]}
