# calificaciones.py
from fastapi import APIRouter, HTTPException, Cookie
from jose import jwt
from bd import get_connection
import psycopg2.extras
import os

router = APIRouter(prefix="/calificaciones", tags=["Calificaciones"])

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALG = "HS256"


def verify_token(access_token: str):
    """Verifica el JWT y devuelve el google_id del usuario autenticado"""
    if not access_token:
        raise HTTPException(status_code=401, detail="No autorizado")
    try:
        payload = jwt.decode(access_token, JWT_SECRET, algorithms=[JWT_ALG])
        return payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")


# ==========================================================
#  Endpoint: obtener calificaciones de un usuario
# ==========================================================
@router.get("/{evaluado_id}")
def obtener_calificaciones_usuario(evaluado_id: str, access_token: str = Cookie(None)):
    """
    Devuelve todas las calificaciones recibidas por un usuario,
    junto con su promedio general de estrellas.
    """
    verify_token(access_token)  # Solo usuarios logueados pueden consultar

    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Obtener las calificaciones recibidas
        cur.execute("""
            SELECT 
                c.id,
                c.estrellas,
                c.comentario,
                c.fecha_calificacion,
                c.evento_id,
                u.nombre AS evaluador_nombre,
                u.foto_perfil AS evaluador_foto
            FROM calificaciones_usuarios c
            JOIN usuarios u ON u.google_id = c.evaluador_id
            WHERE c.evaluado_id = %s
            ORDER BY c.fecha_calificacion DESC;
        """, (evaluado_id,))
        calificaciones = cur.fetchall()

        # Calcular el promedio
        cur.execute("""
            SELECT ROUND(AVG(estrellas), 2) AS promedio
            FROM calificaciones_usuarios
            WHERE evaluado_id = %s;
        """, (evaluado_id,))
        promedio = cur.fetchone()["promedio"]

        cur.close()
        conn.close()

        return {
            "ok": True,
            "evaluado_id": evaluado_id,
            "promedio": float(promedio) if promedio is not None else 0.0,
            "total_calificaciones": len(calificaciones),
            "calificaciones": calificaciones
        }

    except Exception as e:
        print("Error obteniendo calificaciones:", e)
        raise HTTPException(status_code=500, detail="Error interno obteniendo calificaciones")
