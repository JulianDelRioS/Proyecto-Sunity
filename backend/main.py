from typing import Optional
from fastapi import FastAPI, HTTPException, Response, Cookie, UploadFile, File, Path
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google.oauth2 import id_token as google_id_token  # type: ignore
from google.auth.transport import requests as google_requests  # type: ignore
from jose import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
from bd import get_connection
from fastapi.staticfiles import StaticFiles
import psycopg2.extras  # Necesario para RealDictCursor
import shutil
from chat import chat_router



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
    comuna: Optional[str] = None
    region: Optional[str] = None
    telefono: Optional[str] = None
    edad: Optional[int] = None
    deporte_favorito: Optional[str] = None
    descripcion: Optional[str] = None
    universidad_o_instituto: Optional[str] = None  # <-- agregado
    carrera: Optional[str] = None                  # <-- agregado

app.include_router(chat_router)

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
    if not access_token:
        raise HTTPException(status_code=401, detail="No autorizado")

    try:
        payload = jwt.decode(access_token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    # Construir dinámicamente los campos a actualizar
    campos = []
    valores = []
    for campo in ["comuna", "region", "telefono", "edad", "deporte_favorito", "descripcion","universidad_o_instituto", "carrera"]:
        valor = getattr(data, campo)
        if valor is not None:
            campos.append(f"{campo} = %s")
            valores.append(valor)

    if not campos:
        raise HTTPException(status_code=400, detail="No se proporcionaron campos para actualizar")

    valores.append(user_id)  # Para el WHERE

    try:
        conn = get_connection()
        cur = conn.cursor()
        query = f"UPDATE usuarios SET {', '.join(campos)} WHERE google_id = %s"
        cur.execute(query, tuple(valores))
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
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            """
            SELECT foto_perfil, region, comuna, telefono, edad, deporte_favorito, descripcion, universidad_o_instituto, carrera
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

@app.get("/profile/foto")
def get_foto(access_token: str = Cookie(None)):
    user_id = verify_token(access_token)
    data = get_user_data(user_id)
    return {"foto_perfil": data.get("foto_perfil")}

@app.get("/profile/region")
def get_region(access_token: str = Cookie(None)):
    user_id = verify_token(access_token)
    data = get_user_data(user_id)
    return {"region": data.get("region")}

@app.get("/profile/comuna")
def get_comuna(access_token: str = Cookie(None)):
    user_id = verify_token(access_token)
    data = get_user_data(user_id)
    return {"comuna": data.get("comuna")}

@app.get("/profile/telefono")
def get_telefono(access_token: str = Cookie(None)):
    user_id = verify_token(access_token)
    data = get_user_data(user_id)
    return {"telefono": data.get("telefono")}

@app.get("/profile/edad")
def get_edad(access_token: str = Cookie(None)):
    user_id = verify_token(access_token)
    data = get_user_data(user_id)
    return {"edad": data.get("edad")}

@app.get("/profile/deporte")
def get_deporte(access_token: str = Cookie(None)):
    user_id = verify_token(access_token)
    data = get_user_data(user_id)
    return {"deporte_favorito": data.get("deporte_favorito")}

@app.get("/profile/descripcion")
def get_descripcion(access_token: str = Cookie(None)):
    user_id = verify_token(access_token)
    data = get_user_data(user_id)
    return {"descripcion": data.get("descripcion")}

@app.get("/profile/universidad")
def get_universidad(access_token: str = Cookie(None)):
    user_id = verify_token(access_token)
    data = get_user_data(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"universidad_o_instituto": data.get("universidad_o_instituto")}

@app.get("/profile/carrera")
def get_carrera(access_token: str = Cookie(None)):
    user_id = verify_token(access_token)
    data = get_user_data(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"carrera": data.get("carrera")}


# =========================================
# RUTA GRUPOS
# =========================================

@app.get("/grupos")
def get_all_grupos():
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT id, nombre, descripcion FROM grupos_deportivos ORDER BY nombre ASC")
        grupos = cur.fetchall()  # Esto devuelve RealDictRow si usas RealDictCursor
        print("DEBUG grupos:", grupos)
        cur.close()
        conn.close()
    except Exception as e:
        print("Error obteniendo grupos:", e)
        raise HTTPException(status_code=500, detail=f"Error interno obteniendo grupos: {e}")

    grupos_list = [
        {"id": g["id"], "nombre": g["nombre"], "descripcion": g["descripcion"]} for g in grupos
    ]
    return {"ok": True, "grupos": grupos_list}

# Modelo Pydantic para crear un evento
class EventoCrear(BaseModel):
    grupo_id: int
    nombre: str
    descripcion: Optional[str] = ""
    fecha_hora: datetime
    lugar: str
    latitud: float
    longitud: float
    max_participantes: int
    precio: int
    





@app.post("/eventos")
def crear_evento(evento: EventoCrear, access_token: str = Cookie(None)):
    # Obtener el usuario actual a partir del JWT
    user_id = verify_token(access_token)

    # Validación básica
    if evento.max_participantes <= 0:
        raise HTTPException(status_code=400, detail="max_participantes debe ser mayor a 0")

    try:
        conn = get_connection()
        # Cursor como diccionario para acceder a columnas por nombre
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        #  Verificar que el grupo existe
        cur.execute("SELECT id FROM grupos_deportivos WHERE id = %s", (evento.grupo_id,))
        grupo = cur.fetchone()
        if not grupo:
            raise HTTPException(status_code=400, detail="El grupo_id no existe")

        #  Insertar evento incluyendo anfitrion_id y devolver su id
        cur.execute(
            """
            INSERT INTO eventos_deportivos
            (grupo_id, nombre, descripcion, fecha_hora, lugar, latitud, longitud, max_participantes, precio, anfitrion_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (
                evento.grupo_id,
                evento.nombre,
                evento.descripcion,
                evento.fecha_hora,
                evento.lugar,
                evento.latitud,
                evento.longitud,
                evento.max_participantes,
                evento.precio,
                user_id
            )
        )

        evento_creado = cur.fetchone()
        if not evento_creado:
            raise HTTPException(status_code=500, detail="No se pudo crear el evento")

        evento_id = evento_creado["id"]

        #  Registrar automáticamente al anfitrión como participante
        cur.execute(
            """
            INSERT INTO usuarios_eventos (usuario_id, evento_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING  -- evita duplicados si ya estaba registrado
            """,
            (user_id, evento_id)
        )

        #  Commit y cierre
        conn.commit()
        cur.close()
        conn.close()

    except HTTPException:
        raise
    except Exception as e:
        print("Error creando evento:", e)
        raise HTTPException(status_code=500, detail=f"Error interno creando evento: {e}")

    return {
        "ok": True,
        "message": "Evento creado exitosamente y anfitrión registrado como participante.",
        "evento_id": evento_id
    }



@app.get("/grupos/{grupo_id}/eventos")
def get_eventos_por_grupo(grupo_id: int):
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Verificar que el grupo existe
        cur.execute("SELECT id, nombre FROM grupos_deportivos WHERE id = %s", (grupo_id,))
        grupo = cur.fetchone()
        if not grupo:
            raise HTTPException(status_code=404, detail="Grupo no encontrado")

        # Obtener todos los eventos del grupo con la cantidad de participantes y ubicación
        cur.execute(
            """
            SELECT 
                e.id AS evento_id,
                e.nombre,
                e.descripcion,
                e.lugar,
                e.fecha_hora,
                e.precio,
                e.max_participantes,
                e.latitud,
                e.longitud,
                COUNT(ue.usuario_id) AS inscritos
            FROM eventos_deportivos e
            LEFT JOIN usuarios_eventos ue ON e.id = ue.evento_id
            WHERE e.grupo_id = %s
            GROUP BY e.id
            ORDER BY e.fecha_hora ASC;
            """,
            (grupo_id,)
        )

        eventos = cur.fetchall()
        cur.close()
        conn.close()

        # Formatear participantes y agregar lat/lng
        eventos_list = []
        for e in eventos:
            eventos_list.append({
                "evento_id": e["evento_id"],
                "nombre": e["nombre"],
                "descripcion": e["descripcion"],
                "lugar": e["lugar"],
                "fecha_hora": e["fecha_hora"],
                "precio": e["precio"],
                "participantes": f"{e['inscritos']} / {e['max_participantes']}",
                "latitud": e["latitud"],
                "longitud": e["longitud"]
            })

        return {
            "ok": True,
            "grupo_id": grupo["id"],
            "grupo_nombre": grupo["nombre"],
            "eventos": eventos_list
        }

    except Exception as e:
        print("Error obteniendo eventos por grupo:", e)
        raise HTTPException(status_code=500, detail="Error interno obteniendo eventos")





@app.post("/eventos/{evento_id}/unirse")
def unirse_evento(evento_id: int, access_token: str = Cookie(None)):
    # 1️⃣ Obtener usuario desde JWT
    user_id = verify_token(access_token)

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Verificar que el evento existe
        cur.execute(
            "SELECT id, anfitrion_id, max_participantes FROM eventos_deportivos WHERE id = %s",
            (evento_id,)
        )
        evento = cur.fetchone()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        #  Verificar que el usuario no sea el anfitrión
        if evento["anfitrion_id"] == user_id:
            raise HTTPException(status_code=400, detail="El anfitrión no puede unirse como participante")

        #  Verificar que el usuario no esté ya inscrito
        cur.execute(
            "SELECT 1 FROM usuarios_eventos WHERE usuario_id = %s AND evento_id = %s",
            (user_id, evento_id)
        )
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Ya estás inscrito en este evento")

        #  Verificar cupo disponible
        cur.execute(
            "SELECT COUNT(*) AS inscritos FROM usuarios_eventos WHERE evento_id = %s",
            (evento_id,)
        )
        inscritos = cur.fetchone()["inscritos"]
        if inscritos >= evento["max_participantes"]:
            raise HTTPException(status_code=400, detail="El evento ya alcanzó el número máximo de participantes")

        #  Insertar usuario en el evento
        cur.execute(
            "INSERT INTO usuarios_eventos (usuario_id, evento_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (user_id, evento_id)
        )
        conn.commit()

        # Obtener número actualizado de participantes
        cur.execute(
            "SELECT COUNT(*) AS inscritos FROM usuarios_eventos WHERE evento_id = %s",
            (evento_id,)
        )
        actual_inscritos = cur.fetchone()["inscritos"]

        cur.close()
        conn.close()

    except HTTPException:
        raise
    except Exception as e:
        print("Error uniendo usuario al evento:", e)
        raise HTTPException(status_code=500, detail="Error interno uniendo al usuario al evento")

    return {
        "ok": True,
        "message": "Te has unido al evento exitosamente",
        "participantes_actuales": actual_inscritos,
        "max_participantes": evento["max_participantes"]
    }


@app.get("/mis-eventos")
def get_mis_eventos(access_token: str = Cookie(None)):
    """
    Obtiene todos los eventos de un usuario:
    - Como anfitrión
    - Como participante
    Cada evento aparece solo una vez, con el campo 'tipo' indicando si eres 'anfitrion' o 'participante'.
    """
    user_id = verify_token(access_token)

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            """
            SELECT 
                e.id AS evento_id,
                e.nombre,
                e.descripcion,
                e.lugar,
                e.fecha_hora,
                e.precio,
                e.max_participantes,
                e.latitud,
                e.longitud,
                e.grupo_id,
                CASE
                    WHEN e.anfitrion_id = %s THEN 'anfitrion'
                    ELSE 'participante'
                END AS tipo,
                COUNT(ue2.usuario_id) AS inscritos
            FROM eventos_deportivos e
            LEFT JOIN usuarios_eventos ue2 ON e.id = ue2.evento_id
            LEFT JOIN usuarios_eventos ue1 ON e.id = ue1.evento_id AND ue1.usuario_id = %s
            WHERE e.anfitrion_id = %s OR ue1.usuario_id = %s
            GROUP BY e.id
            ORDER BY e.fecha_hora ASC;
            """,
            (user_id, user_id, user_id, user_id)
        )

        eventos = cur.fetchall()
        cur.close()
        conn.close()

    except Exception as e:
        print("Error obteniendo eventos del usuario:", e)
        raise HTTPException(status_code=500, detail="Error interno obteniendo eventos del usuario")

    return {"ok": True, "eventos": eventos}



@app.get("/eventos/{evento_id}/participantes")
def get_participantes_evento(evento_id: int):
    """
    Obtiene todos los participantes de un evento.
    Devuelve al anfitrión con su correo y teléfono y luego el resto de participantes.
    """
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Obtener información del evento y anfitrión
        cur.execute(
            """
            SELECT 
                e.id AS evento_id,
                e.nombre AS evento_nombre,
                e.anfitrion_id,
                u.nombre AS anfitrion_nombre,
                u.email AS anfitrion_email,
                u.telefono AS anfitrion_telefono,
                u.foto_perfil AS anfitrion_foto
            FROM eventos_deportivos e
            JOIN usuarios u ON e.anfitrion_id = u.google_id
            WHERE e.id = %s
            """,
            (evento_id,)
        )
        evento = cur.fetchone()
        if not evento:
            raise HTTPException(status_code=404, detail="Evento no encontrado")

        # Obtener lista de participantes excluyendo al anfitrión
        cur.execute(
            """
            SELECT 
                u.google_id AS id,
                u.nombre,
                u.email,
                u.telefono,
                u.foto_perfil
            FROM usuarios_eventos ue
            JOIN usuarios u ON ue.usuario_id = u.google_id
            WHERE ue.evento_id = %s AND ue.usuario_id != %s
            """,
            (evento_id, evento["anfitrion_id"])
        )
        participantes = cur.fetchall()

        cur.close()
        conn.close()

        return {
            "ok": True,
            "evento": {
                "id": evento["evento_id"],
                "nombre": evento["evento_nombre"],
                "anfitrion": {
                    "id": evento["anfitrion_id"],
                    "nombre": evento["anfitrion_nombre"],
                    "email": evento["anfitrion_email"],
                    "telefono": evento["anfitrion_telefono"],
                    "foto_perfil": evento["anfitrion_foto"]
                }
            },
            "participantes": participantes
        }

    except Exception as e:
        print("Error obteniendo participantes del evento:", e)
        raise HTTPException(status_code=500, detail="Error interno obteniendo participantes del evento")



@app.get("/usuarios/{user_id}")
def get_usuario_por_id(user_id: str = Path(..., description="Google ID del usuario")):
    """
    Obtiene los datos completos de un usuario dado su user_id (google_id),
    incluyendo nombre, email y fecha de registro, pero excluyendo el teléfono.
    """
    try:
        # Traemos todos los campos necesarios
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(
            """
            SELECT nombre, email, foto_perfil, region, comuna, edad, deporte_favorito, descripcion, fecha_registro, universidad_o_instituto, carrera
            FROM usuarios
            WHERE google_id = %s
            """,
            (user_id,)
        )
        data = cur.fetchone()
        cur.close()
        conn.close()

        if not data:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        # Formateamos la respuesta sin el teléfono
        respuesta = {
            "nombre": data.get("nombre"),
            "email": data.get("email"),
            "foto_perfil": data.get("foto_perfil"),
            "region": data.get("region"),
            "comuna": data.get("comuna"),
            "edad": data.get("edad"),
            "deporte_favorito": data.get("deporte_favorito"),
            "descripcion": data.get("descripcion"),
            "fecha_registro": data.get("fecha_registro"),
            "universidad_o_instituto": data.get("universidad_o_instituto"),
            "carrera": data.get("carrera")

        }

        return {"ok": True, "user": respuesta}
    
    except HTTPException:
        raise
    except Exception as e:
        print("Error obteniendo usuario por ID:", e)
        raise HTTPException(status_code=500, detail="Error interno obteniendo usuario")




class SolicitudAmistadCrear(BaseModel):
    destinatario_id: str

class SolicitudAmistadResponder(BaseModel):
    estado: str  # "aceptada" o "rechazada"



# =========================================
# ENPOINTS AMISTADES
# =========================================

@app.post("/amistad/solicitar")
def enviar_solicitud(solicitud: SolicitudAmistadCrear, access_token: str = Cookie(None)):
    solicitante_id = verify_token(access_token)
    destinatario_id = solicitud.destinatario_id

    if solicitante_id == destinatario_id:
        raise HTTPException(status_code=400, detail="No puedes enviarte solicitud a ti mismo")

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Verificar si ya existe la amistad
        cur.execute(
            """
            SELECT 1 FROM amigos
            WHERE (usuario_id = %s AND amigo_id = %s)
               OR (usuario_id = %s AND amigo_id = %s)
            """,
            (solicitante_id, destinatario_id, destinatario_id, solicitante_id)
        )
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Ya son amigos")

        # Verificar si ya existe una solicitud pendiente
        cur.execute(
            """
            SELECT 1 FROM solicitudes_amistad
            WHERE (solicitante_id = %s AND destinatario_id = %s AND estado = 'pendiente')
               OR (solicitante_id = %s AND destinatario_id = %s AND estado = 'pendiente')
            """,
            (solicitante_id, destinatario_id, destinatario_id, solicitante_id)
        )
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Ya existe una solicitud pendiente")

        # Insertar la solicitud
        cur.execute(
            """
            INSERT INTO solicitudes_amistad (solicitante_id, destinatario_id)
            VALUES (%s, %s)
            """,
            (solicitante_id, destinatario_id)
        )
        conn.commit()
        cur.close()
        conn.close()

    except HTTPException:
        raise
    except Exception as e:
        print("Error enviando solicitud:", e)
        raise HTTPException(status_code=500, detail="Error interno enviando solicitud")

    return {"ok": True, "message": "Solicitud enviada"}


@app.post("/amistad/responder/{solicitud_id}")
def responder_solicitud(solicitud_id: int, respuesta: SolicitudAmistadResponder, access_token: str = Cookie(None)):
    usuario_id = verify_token(access_token)
    estado = respuesta.estado.lower()
    if estado not in ["aceptada", "rechazada"]:
        raise HTTPException(status_code=400, detail="Estado inválido")

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Verificar que la solicitud existe y es para este usuario
        cur.execute(
            "SELECT solicitante_id, destinatario_id FROM solicitudes_amistad WHERE id = %s",
            (solicitud_id,)
        )
        solicitud = cur.fetchone()
        if not solicitud:
            raise HTTPException(status_code=404, detail="Solicitud no encontrada")
        if solicitud["destinatario_id"] != usuario_id:
            raise HTTPException(status_code=403, detail="No puedes responder esta solicitud")

        if estado == "aceptada":
            # Crear amistad
            cur.execute(
                """
                INSERT INTO amigos (usuario_id, amigo_id)
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING
                """,
                (usuario_id, solicitud["solicitante_id"])
            )
            # Actualizar estado de la solicitud (opcional, puede quedarse para historial)
            cur.execute(
                """
                UPDATE solicitudes_amistad
                SET estado = %s, fecha_respuesta = CURRENT_TIMESTAMP
                WHERE id = %s
                """,
                (estado, solicitud_id)
            )
        else:  # estado == "rechazada"
            # Borrar la solicitud directamente
            cur.execute(
                "DELETE FROM solicitudes_amistad WHERE id = %s",
                (solicitud_id,)
            )

        conn.commit()
        cur.close()
        conn.close()

    except HTTPException:
        raise
    except Exception as e:
        print("Error respondiendo solicitud:", e)
        raise HTTPException(status_code=500, detail="Error interno respondiendo solicitud")

    return {"ok": True, "message": f"Solicitud {estado}"}


@app.get("/amistad/solicitudes")
def listar_solicitudes(access_token: str = Cookie(None)):
    usuario_id = verify_token(access_token)
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            """
            SELECT s.id,
                   s.solicitante_id,
                   s.estado,
                   s.fecha_solicitud,
                   u.nombre AS nombre_solicitante,
                   u.foto_perfil AS foto_solicitante
            FROM solicitudes_amistad s
            JOIN usuarios u ON s.solicitante_id = u.google_id
            WHERE s.destinatario_id = %s AND s.estado = 'pendiente'
            ORDER BY s.fecha_solicitud DESC
            """,
            (usuario_id,)
        )
        solicitudes = cur.fetchall()
        cur.close()
        conn.close()

    except Exception as e:
        print("Error listando solicitudes:", e)
        raise HTTPException(status_code=500, detail="Error interno listando solicitudes")

    return {"ok": True, "solicitudes": solicitudes}



@app.get("/amistad/lista")
def listar_amigos(access_token: str = Cookie(None)):
    usuario_id = verify_token(access_token)
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            """
            SELECT u.google_id, u.nombre, u.email, u.foto_perfil
            FROM amigos a
            JOIN usuarios u ON (u.google_id = a.amigo_id AND a.usuario_id = %s)
                            OR (u.google_id = a.usuario_id AND a.amigo_id = %s)
            """,
            (usuario_id, usuario_id)
        )
        amigos = cur.fetchall()
        cur.close()
        conn.close()

    except Exception as e:
        print("Error listando amigos:", e)
        raise HTTPException(status_code=500, detail="Error interno listando amigos")

    return {"ok": True, "amigos": amigos}



from fastapi import APIRouter, Cookie, HTTPException

@app.delete("/amistad/eliminar/{amigo_id}")
def eliminar_amigo(amigo_id: str, access_token: str = Cookie(None)):
    """
    Elimina la relación de amistad y cualquier solicitud existente entre los usuarios.
    """
    if not access_token:
        raise HTTPException(status_code=401, detail="No autorizado")

    try:
        payload = jwt.decode(access_token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload["sub"].strip()
    except Exception as e:
        print("Error decodificando token:", e)
        raise HTTPException(status_code=401, detail="Token inválido")

    try:
        conn = get_connection()
        cur = conn.cursor()

        # Eliminar amistad
        cur.execute(
            """
            DELETE FROM amigos
            WHERE (usuario_id = %s AND amigo_id = %s)
               OR (usuario_id = %s AND amigo_id = %s)
            """,
            (user_id, amigo_id, amigo_id, user_id)
        )

        # Eliminar solicitudes en ambas direcciones
        cur.execute(
            """
            DELETE FROM solicitudes_amistad
            WHERE (solicitante_id = %s AND destinatario_id = %s)
               OR (solicitante_id = %s AND destinatario_id = %s)
            """,
            (user_id, amigo_id, amigo_id, user_id)
        )

        conn.commit()
        print("Amistad y solicitudes eliminadas entre", user_id, "y", amigo_id)

    except Exception as e:
        print("❌ Error eliminando amistad o solicitudes:", e)
        raise HTTPException(status_code=500, detail=f"Error interno: {e}")
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

    return {"ok": True, "message": "Amigo y solicitudes relacionadas eliminadas correctamente"}



# =========================================
# ENDPOINTS ADICIONALES AMISTAD
# =========================================

@app.get("/amistad/estado/{otro_id}")
def obtener_estado_amistad(otro_id: str, access_token: str = Cookie(None)):
    """
    Devuelve el estado de la relación entre el usuario actual y otro usuario:
    - 'amigos'
    - 'solicitud_enviada'
    - 'solicitud_recibida'
    - 'ninguno'
    """
    usuario_id = verify_token(access_token)

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Verificar si son amigos
        cur.execute(
            """
            SELECT 1 FROM amigos
            WHERE (usuario_id = %s AND amigo_id = %s)
               OR (usuario_id = %s AND amigo_id = %s)
            """,
            (usuario_id, otro_id, otro_id, usuario_id)
        )
        if cur.fetchone():
            return {"estado": "amigos"}

        # Verificar si hay solicitud enviada por mí
        cur.execute(
            """
            SELECT 1 FROM solicitudes_amistad
            WHERE solicitante_id = %s AND destinatario_id = %s AND estado = 'pendiente'
            """,
            (usuario_id, otro_id)
        )
        if cur.fetchone():
            return {"estado": "solicitud_enviada"}

        # Verificar si hay solicitud recibida
        cur.execute(
            """
            SELECT 1 FROM solicitudes_amistad
            WHERE solicitante_id = %s AND destinatario_id = %s AND estado = 'pendiente'
            """,
            (otro_id, usuario_id)
        )
        if cur.fetchone():
            return {"estado": "solicitud_recibida"}

        return {"estado": "ninguno"}

    except Exception as e:
        print("Error obteniendo estado de amistad:", e)
        raise HTTPException(status_code=500, detail="Error interno")
    finally:
        cur.close()
        conn.close()


@app.delete("/amistad/cancelar/{otro_id}")
def cancelar_solicitud_enviada(otro_id: str, access_token: str = Cookie(None)):
    """
    Cancela una solicitud de amistad pendiente enviada por el usuario actual.
    """
    usuario_id = verify_token(access_token)

    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            """
            DELETE FROM solicitudes_amistad
            WHERE solicitante_id = %s AND destinatario_id = %s AND estado = 'pendiente'
            """,
            (usuario_id, otro_id)
        )
        conn.commit()
        return {"ok": True, "message": "Solicitud cancelada"}

    except Exception as e:
        print("Error cancelando solicitud:", e)
        raise HTTPException(status_code=500, detail="Error interno")
    finally:
        cur.close()
        conn.close()



@app.post("/amistad/aceptar/{usuario_id}")
def aceptar_solicitud(usuario_id: str, access_token: str = Cookie(None)):
    """
    Acepta la solicitud de amistad enviada por el usuario especificado.
    """
    if not access_token:
        raise HTTPException(status_code=401, detail="No autorizado")

    try:
        payload = jwt.decode(access_token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload["sub"].strip()
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Buscar solicitud pendiente del otro usuario hacia mí
        cur.execute(
            """
            SELECT id FROM solicitudes_amistad
            WHERE solicitante_id = %s AND destinatario_id = %s AND estado = 'pendiente'
            """,
            (usuario_id, user_id)
        )
        solicitud = cur.fetchone()
        if not solicitud:
            raise HTTPException(status_code=404, detail="No hay solicitud pendiente de este usuario")

        # Actualizar solicitud a aceptada
        cur.execute(
            """
            UPDATE solicitudes_amistad
            SET estado = 'aceptada', fecha_respuesta = CURRENT_TIMESTAMP
            WHERE id = %s
            """,
            (solicitud['id'],)
        )

        # Crear amistad
        cur.execute(
            """
            INSERT INTO amigos (usuario_id, amigo_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
            """,
            (user_id, usuario_id)
        )

        conn.commit()
        cur.close()
        conn.close()

    except HTTPException:
        raise
    except Exception as e:
        print("Error aceptando solicitud:", e)
        raise HTTPException(status_code=500, detail="Error interno aceptando solicitud")

    return {"ok": True, "message": "Solicitud aceptada"}



@app.get("/amistad/enviadas")
def listar_solicitudes_enviadas(access_token: str = Cookie(None)):
    usuario_id = verify_token(access_token)
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute(
            """
            SELECT s.id,
                   s.destinatario_id,
                   s.estado,
                   s.fecha_solicitud,
                   u.nombre AS nombre_destinatario,
                   u.foto_perfil AS foto_destinatario
            FROM solicitudes_amistad s
            JOIN usuarios u ON s.destinatario_id = u.google_id
            WHERE s.solicitante_id = %s AND s.estado = 'pendiente'
            ORDER BY s.fecha_solicitud DESC
            """,
            (usuario_id,)
        )
        solicitudes = cur.fetchall()
        cur.close()
        conn.close()

    except Exception as e:
        print("Error listando solicitudes enviadas:", e)
        raise HTTPException(status_code=500, detail="Error interno listando solicitudes enviadas")

    return {"ok": True, "solicitudes": solicitudes}
