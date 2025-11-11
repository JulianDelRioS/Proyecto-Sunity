from fastapi import APIRouter, HTTPException, Query
from bd import get_connection
import psycopg2.extras
from jose import jwt
import os

# =========================
# Configuración JWT
# =========================
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALG = "HS256"

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
# Router principal
# =========================
router = APIRouter()


# =========================
# GET promedio y cantidad
# =========================
@router.get("/calificaciones/{evaluado_id}")
def obtener_calificaciones_usuario(evaluado_id: str):
    """Devuelve la cantidad total y el promedio de estrellas de un usuario"""
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT 
                COUNT(*) AS cantidad,
                COALESCE(AVG(estrellas), 0)::NUMERIC(3,2) AS promedio
            FROM calificaciones_usuarios
            WHERE evaluado_id = %s
        """, (evaluado_id,))
        data = cur.fetchone()
        cur.close()
        conn.close()

        return {
            "evaluado_id": evaluado_id,
            "cantidad_calificaciones": data["cantidad"],
            "promedio_estrellas": float(data["promedio"])
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================
# GET detalles
# =========================
@router.get("/calificaciones/{evaluado_id}/detalles")
def obtener_detalles_calificaciones(evaluado_id: str):
    """Devuelve todas las calificaciones que ha recibido un usuario"""
    try:
        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("""
            SELECT 
                cu.id,
                cu.estrellas,
                cu.tipo,
                cu.motivo,
                cu.fecha_calificacion,
                u.nombre AS evaluador_nombre,
                u.foto_perfil AS evaluador_foto
            FROM calificaciones_usuarios cu
            LEFT JOIN usuarios u ON cu.evaluador_id = u.google_id
            WHERE cu.evaluado_id = %s
            ORDER BY cu.fecha_calificacion DESC
        """, (evaluado_id,))
        data = cur.fetchall()
        cur.close()
        conn.close()

        return {"evaluado_id": evaluado_id, "calificaciones": data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calificaciones/{evaluado_id}")
def crear_calificacion(
    evaluado_id: str,
    access_token: str = Query(..., description="Token JWT del evaluador"),
    estrellas: int = Query(..., ge=1, le=5, description="Número de estrellas (1-5)"),
    motivo: str = Query(None, max_length=100, description="Motivo opcional")
):
    """Crea una nueva calificación para un usuario"""
    try:
        evaluador_id = verify_token(access_token)

        # Evitar auto-calificación
        if evaluador_id == evaluado_id:
            raise HTTPException(status_code=400, detail="No puedes calificarte a ti mismo")

        conn = get_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        cur.execute("""
            INSERT INTO calificaciones_usuarios (evaluador_id, evaluado_id, estrellas, motivo)
            VALUES (%s, %s, %s, %s)
            RETURNING id;
        """, (evaluador_id, evaluado_id, estrellas, motivo))

        result = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        if not result or "id" not in result:
            raise HTTPException(status_code=500, detail="No se pudo obtener el ID de la calificación")

        return {
            "mensaje": "Calificación creada exitosamente",
            "calificacion_id": result["id"],
            "evaluador_id": evaluador_id,
            "evaluado_id": evaluado_id,
            "estrellas": estrellas,
            "motivo": motivo
        }

    except HTTPException:
        raise
    except Exception as e:
        print("❌ ERROR AL CREAR CALIFICACIÓN:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
