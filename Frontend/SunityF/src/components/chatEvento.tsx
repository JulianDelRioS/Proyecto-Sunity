import React, { useEffect, useState, useRef } from "react";
import './Styles/chatEvento.css';
import { getProfile } from '../components/funciones';

interface Evento {
  evento_id: number;
  nombre: string;
  tipo: "anfitrion" | "participante";
}

interface Mensaje {
  remitente_id: string;
  mensaje: string;
  fecha_envio: string;
}

interface Usuario {
  nombre: string;
  foto_perfil?: string;
}

const ChatEvento: React.FC = () => {
  const [user, setUser] = useState<Usuario & { google_id: string } | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [selectedEvento, setSelectedEvento] = useState<Evento | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [usuariosCache, setUsuariosCache] = useState<{ [key: string]: Usuario }>({});
  const wsRef = useRef<WebSocket | null>(null);
  const mensajesRef = useRef<HTMLDivElement | null>(null);

  // Obtener datos del usuario activo
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await getProfile();
        setUser({
          google_id: data.user.id,
          nombre: data.user.name,
          foto_perfil: undefined, // o data.user.foto_perfil si tu API lo devuelve
        });
      } catch (err) {
        console.error("No se pudo obtener el usuario:", err);
      }
    };
    fetchUser();
  }, []);

  // Cargar eventos del usuario
  useEffect(() => {
    const fetchEventos = async () => {
      try {
        const res = await fetch("http://localhost:8000/mis-eventos", {
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setEventos(data.eventos);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchEventos();
  }, []);

  // Cargar mensajes de un evento seleccionado y manejar WS
  useEffect(() => {
    if (!selectedEvento) return;

    const fetchMensajes = async () => {
      try {
        const res = await fetch(
          `http://localhost:8000/chat/historial-evento/${selectedEvento.evento_id}`,
          { credentials: "include" }
        );
        if (res.ok) {
          const data = await res.json();
          setMensajes(data.mensajes);

          // Cachear usuarios de los mensajes
          const newCache = { ...usuariosCache };
          for (const m of data.mensajes) {
            if (!newCache[m.remitente_id]) {
              try {
                const userRes = await fetch(
                  `http://localhost:8000/usuarios/${m.remitente_id}`,
                  { credentials: "include" }
                );
                if (userRes.ok) {
                  const userData = await userRes.json();
                  newCache[m.remitente_id] = userData.user;
                }
              } catch {}
            }
          }
          setUsuariosCache(newCache);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchMensajes();

    // Configurar WebSocket
    wsRef.current = new WebSocket(
      `ws://localhost:8000/chat/ws-evento/${selectedEvento.evento_id}`
    );
    wsRef.current.onmessage = async (event) => {
      const msg: Mensaje = JSON.parse(event.data);
      setMensajes((prev) => [...prev, msg]);

      if (!usuariosCache[msg.remitente_id]) {
        try {
          const userRes = await fetch(
            `http://localhost:8000/usuarios/${msg.remitente_id}`,
            { credentials: "include" }
          );
          if (userRes.ok) {
            const userData = await userRes.json();
            setUsuariosCache((prev) => ({ ...prev, [msg.remitente_id]: userData.user }));
          }
        } catch {}
      }
    };

    return () => wsRef.current?.close();
  }, [selectedEvento]);

  // Enviar mensaje
  const enviarMensaje = () => {
    if (!nuevoMensaje.trim() || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({ mensaje: nuevoMensaje }));
    setNuevoMensaje("");
  };

  // Scroll automático
  useEffect(() => {
    if (mensajesRef.current) {
      mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
    }
  }, [mensajes]);

  return (
    <div className="chat-evento-container">
      {/* Sidebar eventos */}
      <div className="chat-evento-sidebar">
        <h2>Mis Eventos</h2>
        <div className="eventos-list">
          {eventos.map((evento) => (
            <div
              key={evento.evento_id}
              className={`evento-item ${selectedEvento?.evento_id === evento.evento_id ? 'activo' : ''}`}
              onClick={() => setSelectedEvento(evento)}
            >
              <div className="evento-info">
                <span className="evento-nombre">{evento.nombre}</span>
                <span className={`evento-tipo ${evento.tipo}`}>
                  {evento.tipo === "anfitrion" ? "Anfitrión" : "Participante"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Área de chat */}
      <div className="chat-evento-main">
        {selectedEvento ? (
          <>
            <div className="chat-header">
              <div className="status-indicator"></div>
              <h3>Chat: {selectedEvento.nombre}</h3>
            </div>

            <div ref={mensajesRef} className="mensajes-container">
              {mensajes.length > 0 ? (
                mensajes.map((m, i) => {
                  const esMio = m.remitente_id === user?.google_id;
                  const usuario = usuariosCache[m.remitente_id];

                  return (
                    <div key={i} className={`mensaje ${esMio ? 'enviado' : 'recibido'}`}>
                      <img
                        src={
                          usuario?.foto_perfil
                            ? `http://localhost:8000${usuario.foto_perfil}`
                            : "/default-profile.png"
                        }
                        alt={usuario?.nombre ?? "Usuario"}
                        className="avatar-mensaje"
                      />
                      <div className="contenido-mensaje">
                        {/* Aquí mostramos el nombre del usuario */}
                        {!esMio && usuario?.nombre && (
                          <strong className="nombre-usuario">{usuario.nombre}</strong>
                        )}
                        <span>{m.mensaje}</span>
                        <small>
                          {new Date(m.fecha_envio).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </small>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">💬</div>
                  <p>No hay mensajes aún. ¡Sé el primero en escribir!</p>
                </div>
              )}
            </div>


            <div className="nuevo-mensaje-container">
              <input
                type="text"
                value={nuevoMensaje}
                onChange={(e) => setNuevoMensaje(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
                placeholder="Escribe un mensaje..."
                className="mensaje-input"
              />
              <button
                onClick={enviarMensaje}
                className="enviar-btn"
                disabled={!nuevoMensaje.trim()}
              >
                Enviar
              </button>
            </div>
          </>
        ) : (
          <div className="no-evento-seleccionado">
            <div className="empty-icon">📅</div>
            <h3>Selecciona un evento</h3>
            <p>Elige un evento de la lista para comenzar a chatear</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatEvento;
