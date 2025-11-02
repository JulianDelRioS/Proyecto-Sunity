from typing import Dict
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

# =========================
# Router para chat
# =========================
chat_router = APIRouter(prefix="/chat", tags=["Chat"])

# =========================
# Conexiones activas
# =========================
# Chat entre amigos: usuario_id -> WebSocket
active_connections: Dict[str, WebSocket] = {}

# Chat de eventos: (evento_id, usuario_id) -> WebSocket
active_event_connections: Dict[tuple, WebSocket] = {}

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
# Chat entre amigos
# =========================

@chat_router.post("/enviar")
def enviar_mensaje(
    data: dict = Body(...),
    access_token: str = Cookie(None)
):
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

@chat_router.get("/historial/{otro_id}")
def historial_mensajes(otro_id: str, access_token: str = Cookie(None)):
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
                for m in mensajes:
                    if isinstance(m["fecha_envio"], datetime):
                        m["fecha_envio"] = m["fecha_envio"].isoformat()
    except Exception as e:
        print("Error obteniendo historial:", e)
        raise HTTPException(status_code=500, detail="Error interno obteniendo mensajes")

    return {"ok": True, "mensajes": mensajes}

@chat_router.websocket("/ws/{otro_id}")
async def websocket_chat(websocket: WebSocket, otro_id: str):
    await websocket.accept()
    token = websocket.cookies.get("access_token")
    remitente_id = verify_token(token)

    active_connections[remitente_id] = websocket
    print(f"🟢 {remitente_id} conectado al chat")

    try:
        while True:
            data = await websocket.receive_json()
            mensaje = data.get("mensaje")
            if not mensaje or not mensaje.strip():
                continue

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

            mensaje_payload = {
                "remitente_id": remitente_id,
                "destinatario_id": otro_id,
                "mensaje": mensaje,
                "fecha_envio": datetime.now().isoformat()
            }

            if otro_id in active_connections:
                await active_connections[otro_id].send_json(mensaje_payload)

            await websocket.send_json(mensaje_payload)

    except WebSocketDisconnect:
        print(f"🔴 {remitente_id} desconectado")
        active_connections.pop(remitente_id, None)





@chat_router.post("/enviar-evento")
async def enviar_mensaje_evento(
    data: dict = Body(...),
    access_token: str = Cookie(None)
):
    usuario_id = verify_token(access_token)
    evento_id = data.get("evento_id")
    mensaje = data.get("mensaje")

    if not evento_id or not mensaje:
        raise HTTPException(status_code=400, detail="Faltan evento o mensaje")
    if not mensaje.strip():
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío")

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO mensajes_eventos (evento_id, remitente_id, mensaje)
                    VALUES (%s, %s, %s)
                    """,
                    (evento_id, usuario_id, mensaje)
                )
                conn.commit()
    except Exception as e:
        print("Error enviando mensaje de evento:", e)
        raise HTTPException(status_code=500, detail="Error interno enviando mensaje")

    mensaje_payload = {
        "evento_id": evento_id,
        "remitente_id": usuario_id,
        "mensaje": mensaje,
        "fecha_envio": datetime.now().isoformat()
    }

    # Broadcast a todos los participantes conectados
    for (e_id, u_id), ws in active_event_connections.items():
        if e_id == evento_id:
            try:
                await ws.send_json(mensaje_payload)  # ✅ ahora se puede usar await
            except:
                pass

    return {"ok": True, "message": "Mensaje enviado al evento exitosamente"}




@chat_router.get("/historial-evento/{evento_id}")
def historial_evento(evento_id: int, access_token: str = Cookie(None)):
    usuario_id = verify_token(access_token)

    # Opcional: verificar que el usuario esté inscrito en el evento
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1 FROM usuarios_eventos 
                WHERE usuario_id = %s AND evento_id = %s
                """,
                (usuario_id, evento_id)
            )
            if cur.fetchone() is None:
                raise HTTPException(status_code=403, detail="No participas en este evento")

    try:
        with get_connection() as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT remitente_id, mensaje, fecha_envio
                    FROM mensajes_eventos
                    WHERE evento_id = %s
                    ORDER BY fecha_envio ASC
                    """,
                    (evento_id,)
                )
                mensajes = cur.fetchall()
                for m in mensajes:
                    if isinstance(m["fecha_envio"], datetime):
                        m["fecha_envio"] = m["fecha_envio"].isoformat()
    except Exception as e:
        print("Error obteniendo historial de evento:", e)
        raise HTTPException(status_code=500, detail="Error interno obteniendo mensajes")

    return {"ok": True, "mensajes": mensajes}



@chat_router.websocket("/ws-evento/{evento_id}")
async def websocket_evento(websocket: WebSocket, evento_id: int):
    await websocket.accept()
    token = websocket.cookies.get("access_token")
    usuario_id = verify_token(token)

    # Guardar conexión activa
    active_event_connections[(evento_id, usuario_id)] = websocket
    print(f"🟢 {usuario_id} conectado al chat del evento {evento_id}")

    try:
        while True:
            data = await websocket.receive_json()
            mensaje = data.get("mensaje")
            if not mensaje or not mensaje.strip():
                continue

            with get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO mensajes_eventos (evento_id, remitente_id, mensaje)
                        VALUES (%s, %s, %s)
                        """,
                        (evento_id, usuario_id, mensaje)
                    )
                    conn.commit()

            mensaje_payload = {
                "evento_id": evento_id,
                "remitente_id": usuario_id,
                "mensaje": mensaje,
                "fecha_envio": datetime.now().isoformat()
            }

            # Broadcast a todos los participantes conectados
            for (e_id, u_id), ws in active_event_connections.items():
                if e_id == evento_id:
                    try:
                        await ws.send_json(mensaje_payload)
                    except:
                        pass

    except WebSocketDisconnect:
        print(f"🔴 {usuario_id} desconectado del evento {evento_id}")
        active_event_connections.pop((evento_id, usuario_id), None)
