import { useHistory, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import './Styles/Home.css';
import './Styles/Principal.css';
import './Styles/VerPerfil.css';
import Logo from "../components/Imagenes/logo.png";
import { getProfile } from '../components/funciones';

interface RouteParams {
  id: string; // este es el id que viene de la ruta
}

interface Usuario {
  nombre: string;
  email: string;
  foto_perfil?: string;
  region?: string;
  comuna?: string;
  edad?: number;
  deporte_favorito?: string;
  descripcion?: string;
  fecha_registro?: string;
  universidad_o_instituto?: string;
  carrera?: string;
}

const VerPerfil: React.FC = () => {
  const history = useHistory();
  const { id } = useParams<RouteParams>();
  const [user, setUser] = useState<any>(null);

  const [perfilDeOtroUsuario, setPerfilDeOtroUsuario] = useState<string | null>(null);
  const [otroUsuario, setOtroUsuario] = useState<Usuario | null>(null);
  const [estadoAmistad, setEstadoAmistad] = useState<string>('ninguno');
  const [cargandoEstado, setCargandoEstado] = useState<boolean>(true);
  const [promedio, setPromedio] = useState<number>(0);
  const [cantidad, setCantidad] = useState<number>(0);
  const [detalles, setDetalles] = useState<any[]>([]);
  const [mostrarDetalles, setMostrarDetalles] = useState<boolean>(false);



  // Cargar perfil del otro usuario
  useEffect(() => {
  if (id) {
    fetch(`http://localhost:8000/usuarios/${id}`)
      .then(res => res.json())
      .then(data => setOtroUsuario(data.user))
      .catch(err => console.error(err));
  }
}, [id, location.search]); // 👈 se ejecuta también si cambia el parámetro
  useEffect(() => {
    setPerfilDeOtroUsuario(id);

    if (id) {
      fetch(`http://localhost:8000/usuarios/${id}`)
        .then((res) => {
          if (!res.ok) throw new Error("Error al obtener usuario");
          return res.json();
        })
        .then((data) => setOtroUsuario(data.user))
        .catch((err) => console.error(err));
    }
  }, [id]);

  // Verificar sesión del usuario actual
  useEffect(() => {
    const checkSession = async () => {
      try {
        const data = await getProfile();
        setUser(data.user);
      } catch (err) {
        history.push("/home");
      }
    };
    checkSession();
  }, [history]);

  // Obtener estado de amistad
  useEffect(() => {
    if (!perfilDeOtroUsuario) return;
    const fetchEstado = async () => {
      setCargandoEstado(true);
      try {
        const res = await fetch(`http://localhost:8000/amistad/estado/${perfilDeOtroUsuario}`, {
          credentials: 'include'
        });
        const data = await res.json();
        setEstadoAmistad(data.estado);
      } catch (err) {
        console.error(err);
      } finally {
        setCargandoEstado(false);
      }
    };
    fetchEstado();
  }, [perfilDeOtroUsuario]);
  // Obtener calificaciones del usuario
  useEffect(() => {
    if (!id) return;

    const fetchCalificaciones = async () => {
      try {
        // Obtener promedio y cantidad
        const resProm = await fetch(`http://localhost:8000/calificaciones/${id}`);
        const dataProm = await resProm.json();
        setPromedio(dataProm.promedio_estrellas);
        setCantidad(dataProm.cantidad_calificaciones);

        // Obtener detalles de calificaciones
        const resDet = await fetch(`http://localhost:8000/calificaciones/${id}/detalles`);
        const dataDet = await resDet.json();
        setDetalles(dataDet.calificaciones);
      } catch (err) {
        console.error("Error cargando calificaciones:", err);
      }
    };

    fetchCalificaciones();
  }, [id]);


  const handleSolicitud = async () => {
    if (!perfilDeOtroUsuario) return;

    try {
      if (estadoAmistad === 'ninguno') {
        // Enviar solicitud
        const res = await fetch(`http://localhost:8000/amistad/solicitar`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ destinatario_id: perfilDeOtroUsuario })
        });
        const data = await res.json();
        if (res.ok) {
          setEstadoAmistad('solicitud_enviada');
        } else {
          alert(data.detail || 'Error enviando solicitud');
        }
      } else if (estadoAmistad === 'solicitud_enviada') {
        // Cancelar solicitud enviada
        const res = await fetch(`http://localhost:8000/amistad/cancelar/${perfilDeOtroUsuario}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        const data = await res.json();
        if (res.ok) {
          setEstadoAmistad('ninguno');
        } else {
          alert(data.detail || 'Error cancelando solicitud');
        }
      } else if (estadoAmistad === 'solicitud_recibida') {
        // Aceptar solicitud recibida
        const res = await fetch(`http://localhost:8000/amistad/aceptar/${perfilDeOtroUsuario}`, {
          method: 'POST',
          credentials: 'include'
        });
        const data = await res.json();
        if (res.ok) {
          setEstadoAmistad('amigos');
        } else {
          alert(data.detail || 'Error aceptando solicitud');
        }
      }
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
            {otroUsuario ? (
              <div className="perfil-container-verperfil">
                {/* Header del perfil */}
                <div className="perfil-header-verperfil">
                  <div className="avatar-section-verperfil">
                    <img
                      src={otroUsuario.foto_perfil 
                            ? `http://localhost:8000${otroUsuario.foto_perfil}` 
                            : "/default-profile.png"}
                      alt="Foto de perfil"
                      className="perfil-avatar-verperfil"
                    />
                  </div>
                  <div className="perfil-info-verperfil">
                    <h2 className="perfil-nombre-verperfil">{otroUsuario.nombre}</h2>
                    <p className="perfil-email-verperfil">{otroUsuario.email}</p>
                    <div className="perfil-meta-verperfil">
                      {otroUsuario.region && otroUsuario.comuna && (
                        <span className="location-tag-verperfil">
                          📍 {otroUsuario.region}, {otroUsuario.comuna}
                        </span>
                      )}
                      {otroUsuario.edad && (
                        <span className="age-tag-verperfil">🎂 {otroUsuario.edad} años</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Información deportiva */}
                {otroUsuario.deporte_favorito && (
                  <div className="info-section-verperfil">
                    <div className="section-header-verperfil">
                      <span className="section-icon-verperfil">⚽</span>
                      <h3>Deporte Favorito</h3>
                    </div>
                    <div className="deporte-card-verperfil">
                      {otroUsuario.deporte_favorito}
                    </div>
                  </div>
                )}

                {/* Descripción */}
                {otroUsuario.descripcion && (
                  <div className="info-section-verperfil">
                    <div className="section-header-verperfil">
                      <span className="section-icon-verperfil">📝</span>
                      <h3>Acerca de mí</h3>
                    </div>
                    <div className="descripcion-box-verperfil">
                      <p>{otroUsuario.descripcion}</p>
                    </div>
                  </div>
                )}

                {/* Información adicional */}
                <div className="info-grid-verperfil">
                  {otroUsuario.fecha_registro && (
                    <div className="info-item-verperfil">
                      <div className="info-label-verperfil">
                        <span className="info-icon-verperfil">📅</span>
                        Miembro desde
                      </div>
                      <div className="info-value-verperfil">
                        {new Date(otroUsuario.fecha_registro).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  )}

                  {otroUsuario.universidad_o_instituto && (
                    <div className="info-item-verperfil">
                      <div className="info-label-verperfil">
                        <span className="info-icon-verperfil">🎓</span>
                        Universidad / Instituto
                      </div>
                      <div className="info-value-verperfil">
                        {otroUsuario.universidad_o_instituto}
                      </div>
                    </div>
                  )}

                  {otroUsuario.carrera && (
                    <div className="info-item-verperfil">
                      <div className="info-label-verperfil">
                        <span className="info-icon-verperfil">📚</span>
                        Carrera
                      </div>
                      <div className="info-value-verperfil">
                        {otroUsuario.carrera}
                      </div>
                    </div>
                  )}
                </div>

                {/* Calificaciones */}
                <div className="info-section-verperfil">
                  <div className="section-header-verperfil">
                    <span className="section-icon-verperfil">⭐</span>
                    <h3>Calificaciones</h3>
                  </div>

                  <div className="rating-summary-verperfil">
                  {/* Mostrar estrellas visuales - VERSIÓN CORREGIDA */}
                  <div className="rating-stars-container">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const starValue = i + 1;
                      let starClass = "star-empty";
                      let starChar = "☆";
                      
                      if (starValue <= Math.floor(promedio)) {
                        // Estrella completamente llena
                        starClass = "star-filled";
                        starChar = "★";
                      } else if (starValue - 0.5 <= promedio) {
                        // Media estrella
                        starClass = "star-half";
                        starChar = "★";
                      }
                      // else: estrella vacía (valores por defecto)
                      
                      return (
                        <span key={i} className={starClass}>
                          {starChar}
                        </span>
                      );
                    })}
                  </div>

                    <p className="rating-average-text">
                      {promedio.toFixed(1)} de 5 ({cantidad} calificaciones)
                    </p>

                    {cantidad > 0 && (
                      <button
                        className="btn-detalles-calificaciones"
                        onClick={() => setMostrarDetalles(!mostrarDetalles)}
                      >
                        {mostrarDetalles ? "🔽 Ocultar detalles" : "📋 Ver detalles"}
                      </button>
                    )}
                  </div>

                  {/* Detalles (expandibles) */}
                  {mostrarDetalles && (
                    <div className="rating-list-verperfil">
                      {detalles.length > 0 ? (
                        detalles.map((item) => (
                          <div key={item.id} className="rating-item-verperfil">
                            <div className="rating-header-verperfil">
                            {item.evaluador_nombre !== "Sistema" && (
                              <img
                                src={item.evaluador_foto ? `http://localhost:8000${item.evaluador_foto}` : "/default-profile.png"}
                                alt="Evaluador"
                                className="rating-avatar-verperfil"
                              />
                            )}

                              <div>
                                <strong>{item.evaluador_nombre || "Usuario anónimo"}</strong>
                                <p className="rating-stars-verperfil">
                                  {"★".repeat(item.estrellas) + "☆".repeat(5 - item.estrellas)}
                                </p>
                              </div>
                            </div>
                            {item.motivo && <p className="rating-motivo-verperfil">💬 {item.motivo}</p>}
                            <p className="rating-fecha-verperfil">
                              {new Date(item.fecha_calificacion).toLocaleDateString("es-ES")}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="no-ratings-verperfil">Aún no tiene calificaciones.</p>
                      )}
                    </div>
                  )}
                </div>

                

                {/* Botones de acción */}
                <div className="action-buttons-verperfil">
                  <button
                    className="btn-volver-verperfil"
                    onClick={() => history.goBack()}
                  >
                    🔙 Volver
                  </button>

                  {user && user.id.toString() === id ? (
                    // Si el perfil es del mismo usuario logueado
                    <button
                      className="btn-solicitud-verperfil"
                      onClick={() => history.push("/MiPerfil")}
                    >
                      ✏️ Editar mi perfil
                    </button>
                  ) : (
                    // Si es otro usuario
                    <button
                      className="btn-solicitud-verperfil"
                      onClick={handleSolicitud}
                      disabled={cargandoEstado}
                    >
                      {estadoAmistad === 'ninguno' && '🤝 Enviar solicitud de amistad'}
                      {estadoAmistad === 'solicitud_enviada' && '❌ Cancelar solicitud'}
                      {estadoAmistad === 'solicitud_recibida' && '✅ Aceptar solicitud'}
                      {estadoAmistad === 'amigos' && '✅ Son amigos'}
                    </button>
                  )}
                </div>


              </div>
            ) : (
              <div className="loading-container-verperfil">
                <div className="loading-spinner-verperfil"></div>
                <p>Cargando perfil...</p>
              </div>
            )}
          </div>

        </div>
      </IonContent>
    </IonPage>
  );
};

export default VerPerfil;
