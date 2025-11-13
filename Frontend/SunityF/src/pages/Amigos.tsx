import { IonContent, IonPage } from '@ionic/react';
import './Styles/Home.css';
import './Styles/Principal.css';
import './Styles/Amigos.css';
import Logo from "../components/Imagenes/logo.png";
import { useHistory } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getProfile } from '../components/funciones';

interface Usuario {
  google_id: string;
  nombre: string;
  email: string;
  foto_perfil?: string;
}

interface Solicitud {
  id: number;
  solicitante_id: string;
  destinatario_id: string;
  estado: string;
  fecha_solicitud: string;
  nombre_solicitante?: string;
  foto_solicitante?: string;
  nombre_destinatario?: string;
  foto_destinatario?: string;
}

const Amigos: React.FC = () => {
  const history = useHistory();
  const [user, setUser] = useState<any>(null);

  const [seccion, setSeccion] = useState<'amigos' | 'recibidas' | 'enviadas'>('amigos');

  const [listaAmigos, setListaAmigos] = useState<Usuario[]>([]);
  const [solicitudesRecibidas, setSolicitudesRecibidas] = useState<Solicitud[]>([]);
  const [solicitudesEnviadas, setSolicitudesEnviadas] = useState<Solicitud[]>([]);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await getProfile();
        setUser(data.user);
        cargarDatos();
      } catch (err) {
        history.push("/home");
      }
    };
    checkSession();
  }, [history]);

  const cargarDatos = async () => {
    try {
      // Lista de amigos
      const resAmigos = await fetch('http://localhost:8000/amistad/lista', {
        credentials: 'include'
      });
      const dataAmigos = await resAmigos.json();
      if (resAmigos.ok) setListaAmigos(dataAmigos.amigos);

      // Solicitudes recibidas
      const resRecibidas = await fetch('http://localhost:8000/amistad/solicitudes', {
        credentials: 'include'
      });
      const dataRecibidas = await resRecibidas.json();
      if (resRecibidas.ok) setSolicitudesRecibidas(dataRecibidas.solicitudes);

      // Solicitudes enviadas
      const resEnviadas = await fetch('http://localhost:8000/amistad/enviadas', {
        credentials: 'include'
      });
      const dataEnviadas = await resEnviadas.json();
      if (resEnviadas.ok) setSolicitudesEnviadas(dataEnviadas.solicitudes);

    } catch (err) {
      console.error(err);
    }
  };

  if (!user) {
    return <IonPage><IonContent>Verificando sesión...</IonContent></IonPage>;
  }

  return (
    <IonPage>
      <IonContent id="main-content">
        <div className="home-center">
          <div className="title-menu-container">
            <h1>
              Sunity
              <img
                src={Logo}
                alt="Logo"
                className="logo-icon"
                onClick={() => history.push("/principal")}
                style={{ cursor: "pointer" }}
              />
            </h1>

          </div>

          <div className="white-container">
            {/* Menu de secciones */}
            <div className="amigos-menu">
              <button className={seccion === 'amigos' ? 'active-tab' : ''} onClick={() => setSeccion('amigos')}>Amigos</button>
              <button className={seccion === 'recibidas' ? 'active-tab' : ''} onClick={() => setSeccion('recibidas')}>Solicitudes recibidas</button>
              <button className={seccion === 'enviadas' ? 'active-tab' : ''} onClick={() => setSeccion('enviadas')}>Solicitudes enviadas</button>
            </div>

            {/* Contenido según sección */}
            <div className="amigos-contenido">

              {/* Amigos */}
              {seccion === 'amigos' && (
                <>
                  {listaAmigos.length === 0 ? (
                    <p>No tienes amigos aún.</p>
                  ) : (
                    listaAmigos.map((a) => (
                      <div key={a.google_id} className="amigo-item">
                        <img
                          src={a.foto_perfil ? `http://localhost:8000${a.foto_perfil}` : "/default-profile.png"}
                          alt="Foto"
                          className="amigo-avatar"
                        />
                        <span>{a.nombre}</span>
                        <button onClick={() => history.push(`/ver-perfil/${a.google_id}`)}>Ver perfil</button>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`http://localhost:8000/amistad/eliminar/${a.google_id}`, {
                                method: 'DELETE',
                                credentials: 'include'
                              });
                              if (res.ok) cargarDatos();
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                        >
                          Eliminar amigo
                        </button>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* Solicitudes recibidas */}
              {seccion === 'recibidas' && (
                <>
                  {solicitudesRecibidas.length === 0 ? (
                    <p>No hay solicitudes recibidas.</p>
                  ) : (
                    solicitudesRecibidas.map((s) => (
                      <div key={s.id} className="solicitud-item">
                        <div className="solicitud-info">
                          <img
                            src={s.foto_solicitante ? `http://localhost:8000${s.foto_solicitante}` : "/default-profile.png"}
                            alt="Foto"
                            className="amigo-avatar"
                          />
                          <span>{s.nombre_solicitante}</span>
                        </div>

                        <div className="solicitud-botones">
                          <button onClick={() => history.push(`/ver-perfil/${s.solicitante_id}`)}>Ver perfil</button>
                          <button onClick={async () => {
                            const res = await fetch(`http://localhost:8000/amistad/responder/${s.id}`, {
                              method: 'POST',
                              credentials: 'include',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ estado: 'aceptada' }),
                            });
                            if (res.ok) cargarDatos();
                          }}>Aceptar</button>
                          <button onClick={async () => {
                            const res = await fetch(`http://localhost:8000/amistad/responder/${s.id}`, {
                              method: 'POST',
                              credentials: 'include',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ estado: 'rechazada' }),
                            });
                            if (res.ok) cargarDatos();
                          }}>Rechazar</button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* Solicitudes enviadas */}
              {seccion === 'enviadas' && (
                <>
                  {solicitudesEnviadas.length === 0 ? (
                    <p>No hay solicitudes enviadas.</p>
                  ) : (
                    solicitudesEnviadas.map((s) => (
                      <div key={s.id} className="solicitud-item">
                        <div className="solicitud-info">
                          <img
                            src={s.foto_destinatario ? `http://localhost:8000${s.foto_destinatario}` : "/default-profile.png"}
                            alt="Foto"
                            className="amigo-avatar"
                          />
                          <span>{s.nombre_destinatario}</span>
                        </div>
                        <div className="solicitud-botones">
                          <button onClick={() => history.push(`/ver-perfil/${s.destinatario_id}`)}>Ver perfil</button>
                          <button onClick={async () => {
                            const res = await fetch(`http://localhost:8000/amistad/cancelar/${s.destinatario_id}`, {
                              method: 'DELETE',
                              credentials: 'include'
                            });
                            if (res.ok) cargarDatos();
                          }}>Cancelar</button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Amigos;
