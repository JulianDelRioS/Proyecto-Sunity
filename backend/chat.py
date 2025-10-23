from typing import List, Dict
from fastapi import APIRouter, HTTPException, Cookie, Body, WebSocket, WebSocketDisconnect
from jose import jwt
from datetime import datetime
from bd import get_connection
import psycopg2.extras
import os

# =========================
# Configuración JWT
# =========================
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALG = "HS256"

chat_router = APIRouter()

# Conexiones activas (usuario_id -> WebSocket)
active_connections: Dict[str, WebSocket] = {}


# =========================
# Verificación de Token
# =========================
def verify_token(access_token: str) -> str:
    """Decodifica el JWT y devuelve el google_id del usuario"""
    if not access_token:
        raise HTTPException(status_code=401, detail="No autorizado")
    try:
        payload = jwt.decode(access_token, JWT_SECRET, algorithms=[JWT_ALG])
        google_id = payload.get("sub")
        if not google_id:
            raise HTTPException(status_code=401, detail="Token inválido")
        return google_id.strip()
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")


# =========================
# Enviar mensaje (HTTP)
# =========================
@chat_router.post("/chat/enviar")
def enviar_mensaje(
    data: dict = Body(...),
    access_token: str = Cookie(None)
):
    """Envía un mensaje de un usuario a otro"""
    remitente_id = verify_token(access_token)

    destinatario_id = data.get("destinatario_id")
    mensaje = data.get("mensaje")

    if not destinatario_id or not mensaje:
        raise HTTPException(status_code=400, detail="Faltan destinatario o mensaje")

    if remitente_id == destinatario_id:
        raise HTTPException(status_code=400, detail="No puedes enviarte mensajes a ti mismo")

    if not mensaje.strip():
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO mensajes_amigos (remitente_id, destinatario_id, mensaje)
                    VALUES (%s, %s, %s)
                    """,
                    (remitente_id, destinatario_id, mensaje)
                )
                conn.commit()
    except Exception as e:
        print("Error enviando mensaje:", e)
        raise HTTPException(status_code=500, detail="Error interno enviando mensaje")

    return {"ok": True, "message": "Mensaje enviado exitosamente"}


# =========================
# Historial de mensajes (HTTP)
# =========================
@chat_router.get("/chat/historial/{otro_id}")
def historial_mensajes(otro_id: str, access_token: str = Cookie(None)):
    """Obtiene el historial de mensajes entre el usuario logueado y otro usuario"""
    usuario_id = verify_token(access_token)

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT remitente_id, destinatario_id, mensaje, fecha_envio
                    FROM mensajes_amigos
                    WHERE LEAST(remitente_id, destinatario_id) = LEAST(%s, %s)
                      AND GREATEST(remitente_id, destinatario_id) = GREATEST(%s, %s)
                    ORDER BY fecha_envio ASC
                    """,
                    (usuario_id, otro_id, usuario_id, otro_id)
                )
                mensajes = cur.fetchall()

                # Convertir fechas a formato ISO 8601
                for m in mensajes:
                    if isinstance(m["fecha_envio"], datetime):
                        m["fecha_envio"] = m["fecha_envio"].isoformat()

    except Exception as e:
        print("Error obteniendo historial:", e)
        raise HTTPException(status_code=500, detail="Error interno obteniendo mensajes")

    return {"ok": True, "mensajes": mensajes}


# =========================
# Chat en tiempo real (WebSocket)
# =========================
@chat_router.websocket("/ws/chat/{otro_id}")
async def websocket_chat(websocket: WebSocket, otro_id: str):
    """Canal WebSocket para chat en tiempo real entre dos usuarios"""
    await websocket.accept()
    token = websocket.cookies.get("access_token")
    remitente_id = verify_token(token)

    # Registrar conexión activa
    active_connections[remitente_id] = websocket
    print(f"🟢 {remitente_id} conectado al chat")

    try:
        while True:
            data = await websocket.receive_json()
            mensaje = data.get("mensaje")

            if not mensaje or not mensaje.strip():
                continue

            # Guardar mensaje en la base de datos
            with get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO mensajes_amigos (remitente_id, destinatario_id, mensaje)
                        VALUES (%s, %s, %s)
                        """,
                        (remitente_id, otro_id, mensaje)
                    )
                    conn.commit()

            # Crear payload del mensaje
            mensaje_payload = {
                "remitente_id": remitente_id,
                "destinatario_id": otro_id,
                "mensaje": mensaje,
                "fecha_envio": datetime.now().isoformat()
            }

            # Enviar mensaje al destinatario si está conectado
            if otro_id in active_connections:
                await active_connections[otro_id].send_json(mensaje_payload)

            # Enviar también el mensaje al propio remitente (para mostrar en su chat)
            await websocket.send_json(mensaje_payload)

    except WebSocketDisconnect:
        print(f"🔴 {remitente_id} desconectado")
        active_connections.pop(remitente_id, None)
