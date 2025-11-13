import { IonInput, IonButton, IonItem, IonLabel, IonList } from '@ionic/react';
import { useEffect, useState, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import './Styles/Chat.css';
import { getProfile } from '../components/funciones';

interface Usuario {
  google_id: string;
  nombre: string;
  foto_perfil?: string;
}

interface Mensaje {
  remitente_id: string;
  destinatario_id: string;
  mensaje: string;
  fecha_envio: string;
}

const Chat: React.FC = () => {
  const history = useHistory();
  const [user, setUser] = useState<Usuario | null>(null);
  const [amigos, setAmigos] = useState<Usuario[]>([]);
  const [amigoActivo, setAmigoActivo] = useState<Usuario | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mensajesRef = useRef<HTMLDivElement | null>(null);

  // Inicialización: usuario y amigos
  useEffect(() => {
    const init = async () => {
      try {
        const data = await getProfile();
        setUser({
          google_id: data.user.id,
          nombre: data.user.name,
          foto_perfil: undefined,
        });

        const res = await fetch('http://localhost:8000/amistad/lista', { credentials: 'include' });
        if (res.ok) {
          const dataAmigos = await res.json();
          setAmigos(dataAmigos.amigos);
        }
      } catch {
        history.push('/home');
      }
    };
    init();
  }, [history]);

  // Cargar mensajes de un amigo
  const cargarMensajes = async (otro_id: string) => {
    if (!user || escribiendo) return;
    try {
      const res = await fetch(`http://localhost:8000/chat/historial/${otro_id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setMensajes(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(data.mensajes)) {
            return data.mensajes;
          }
          return prev;
        });
        scrollToBottom();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Scroll automático al final
  const scrollToBottom = () => {
    if (mensajesRef.current) {
      mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight;
    }
  };

  // Polling: refrescar mensajes cada 2 segundos
  useEffect(() => {
    if (amigoActivo && user) {
      cargarMensajes(amigoActivo.google_id);

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        cargarMensajes(amigoActivo.google_id);
      }, 2000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [amigoActivo, user]);

  // Enviar mensaje
  const enviarMensaje = async () => {
    if (!nuevoMensaje.trim() || !amigoActivo) return;
    try {
      const res = await fetch('http://localhost:8000/chat/enviar', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinatario_id: amigoActivo.google_id, mensaje: nuevoMensaje }),
      });
      if (res.ok) {
        setNuevoMensaje('');
        setEscribiendo(false);
        cargarMensajes(amigoActivo.google_id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="chat-container">
      {/* Lista de amigos */}
      <div className="chat-amigos">
        <h2>Amigos</h2>
        <IonList>
          {amigos.map(a => (
            <IonItem
              key={a.google_id}
              button
              onClick={() => { setAmigoActivo(a); cargarMensajes(a.google_id); }}
              className={amigoActivo?.google_id === a.google_id ? 'activo' : ''}
            >
              <img
                src={a.foto_perfil ? `http://localhost:8000${a.foto_perfil}` : '/default-profile.png'}
                alt="Foto"
                className="avatar"
              />
              <IonLabel>{a.nombre}</IonLabel>
            </IonItem>
          ))}
        </IonList>
      </div>

      {/* Chat */}
      <div className="chat-mensajes">
        <h2>{amigoActivo ? amigoActivo.nombre : 'Selecciona un amigo'}</h2>
        <div className="mensajes-list" ref={mensajesRef}>
          {mensajes.map((m, i) => {
            const esMio = m.remitente_id === user?.google_id;

            return (
              <div
                key={i}
                className={`mensaje ${esMio ? 'enviado' : 'recibido'}`}
              >
                {!esMio && (
                  <img
                    src={amigoActivo?.foto_perfil ? `http://localhost:8000${amigoActivo.foto_perfil}` : '/default-profile.png'}
                    alt="Avatar"
                    className="avatar-mensaje"
                  />
                )}

                <div className="contenido-mensaje">
                  <span>{m.mensaje}</span>
                  <small>{new Date(m.fecha_envio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
                </div>
              </div>
            );
          })}
        </div>

        {amigoActivo && (
          <div className="nuevo-mensaje">
            <IonInput
              value={nuevoMensaje}
              placeholder="Escribe un mensaje..."
              onIonChange={e => {
                setNuevoMensaje(e.detail.value!);
                setEscribiendo(e.detail.value!.length > 0);
              }}
              onKeyPress={e => e.key === 'Enter' && enviarMensaje()}
            />
            <IonButton onClick={enviarMensaje}>Enviar</IonButton>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;