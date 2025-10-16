import React, { useEffect, useState } from 'react';
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import './Eventos.css';

interface Evento {
  evento_id: number;
  nombre: string;
  descripcion: string;
  fecha_hora: string;
  lugar: string;
  precio: number;
  participantes: string;
  latitud: number;
  longitud: number;
}

interface EventosProps {
  grupoId: number | null;
}

const Eventos: React.FC<EventosProps> = ({ grupoId }) => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grupoNombre, setGrupoNombre] = useState<string>("");
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: "AIzaSyARn1iesZ0davsL71G7SEvuonnbR13XCZE"
  });

  useEffect(() => {
    if (!grupoId) {
      setLoading(false);
      return;
    }

    const fetchEventos = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`http://localhost:8000/grupos/${grupoId}/eventos`);
        if (!res.ok) throw new Error("Error al obtener los eventos");
        const data = await res.json();
        setGrupoNombre(data.grupo_nombre);
        setEventos(data.eventos);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEventos();
  }, [grupoId]);

  // Función para unirse a un evento
  const unirseEvento = async (eventoId: number) => {
    try {
      const res = await fetch(`http://localhost:8000/eventos/${eventoId}/unirse`, {
        method: 'POST',
        credentials: 'include', // para enviar cookies
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al unirse al evento");

      alert(data.message);

      // Actualizar número de participantes en el modal y en la lista
      setEventoSeleccionado((prev) =>
        prev
          ? { ...prev, participantes: `${data.participantes_actuales} / ${data.max_participantes}` }
          : prev
      );
      setEventos((prev) =>
        prev.map((e) =>
          e.evento_id === eventoId
            ? { ...e, participantes: `${data.participantes_actuales} / ${data.max_participantes}` }
            : e
        )
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (!grupoId) return (
    <div className="eventos-container">
      <div className="eventos-wrapper">
        <div className="no-group-state">
          <div className="no-group-content">
            <div className="no-group-icon">👈</div>
            <h3>Selecciona un Grupo</h3>
            <p>Elige un grupo deportivo para ver sus eventos y actividades programadas.</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className="eventos-container">
      <div className="eventos-wrapper">
        <div className="loading-state">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h3>Cargando Eventos</h3>
            <p>Buscando actividades en {grupoNombre}...</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (error) return (
    <div className="eventos-container">
      <div className="eventos-wrapper">
        <div className="error-state">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h2>Error al cargar los eventos</h2>
            <p>{error}</p>
            <div className="error-actions">
              <button className="btn-retry" onClick={() => window.location.reload()}>
                🔄 Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (eventos.length === 0) return (
    <div className="eventos-container">
      <div className="eventos-wrapper">
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No hay eventos programados</h3>
          <p>Actualmente no hay eventos disponibles para el grupo {grupoNombre}.</p>
          <p>¡Sé el primero en organizar una actividad!</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="eventos-container">
      <div className="eventos-wrapper">
        <div className="eventos-header">
          <div className="header-content">
            <h2>Eventos del Grupo</h2>
            <p className="grupo-subtitle">
              Actividades y eventos programados para {grupoNombre}
            </p>
          </div>
          <div className="header-stats">
            <div className="stat-badge">
              {eventos.length} {eventos.length === 1 ? 'Evento' : 'Eventos'}
            </div>
          </div>
        </div>

        <div className="eventos-main">
          <div className="eventos-content">
            <div className="eventos-grid">
              {eventos.map((evento) => (
                <div key={evento.evento_id} className="evento-card">
                  <div className="evento-header">
                    <h3 className="evento-title">{evento.nombre}</h3>
                    <div className="evento-badge">
                      {evento.precio === 0 ? 'Gratis' : `$${evento.precio}`}
                    </div>
                  </div>
                  
                  <div className="evento-details">
                    <div className="evento-detail">
                      <span className="evento-icon">📅</span>
                      <strong>Fecha:</strong>
                      <span>{new Date(evento.fecha_hora).toLocaleString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</span>
                    </div>
                    
                    <div className="evento-detail">
                      <span className="evento-icon">📍</span>
                      <strong>Lugar:</strong>
                      <span>{evento.lugar}</span>
                    </div>                   
                  </div>
        
                  <div className="evento-participantes">
                    <span className="participantes-icon">👥</span>
                    <span className="participantes-text">
                      {evento.participantes || 'Aún no hay participantes'}
                    </span>
                  </div>

                  <button
                    className="btn-ver-informacion"
                    onClick={() => setEventoSeleccionado(evento)}
                  >
                    🔍 Ver información
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de información profesional */}
      {eventoSeleccionado && (
        <div className="evento-modal" onClick={() => setEventoSeleccionado(null)}>
          <div className="modal-contenido" onClick={(e) => e.stopPropagation()}>
            {/* Header del modal */}
            <div className="modal-header">
              <button className="btn-cerrar" onClick={() => setEventoSeleccionado(null)}>
                ×
              </button>
              <h2>{eventoSeleccionado.nombre}</h2>
              <div className="modal-precio-badge">
                {eventoSeleccionado.precio === 0 ? 'Evento Gratuito' : `$${eventoSeleccionado.precio}`}
              </div>
            </div>

            {/* Cuerpo del modal */}
            <div className="modal-body">
              <div className="modal-descripcion">
                <p>{eventoSeleccionado.descripcion}</p>
              </div>

              <div className="modal-details-grid">
                <div className="modal-detail-card">
                  <span className="detail-icon">📅</span>
                  <div className="detail-content">
                    <div className="detail-label">Fecha y Hora</div>
                    <div className="detail-value">
                      {new Date(eventoSeleccionado.fecha_hora).toLocaleString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>

                <div className="modal-detail-card">
                  <span className="detail-icon">📍</span>
                  <div className="detail-content">
                    <div className="detail-label">Ubicación</div>
                    <div className="detail-value">{eventoSeleccionado.lugar}</div>
                  </div>
                </div>

                <div className="modal-detail-card">
                  <span className="detail-icon">💰</span>
                  <div className="detail-content">
                    <div className="detail-label">Precio</div>
                    <div className="detail-value">
                      {eventoSeleccionado.precio === 0 ? 'Gratuito' : `$${eventoSeleccionado.precio}`}
                    </div>
                  </div>
                </div>

                <div className="modal-detail-card">
                  <span className="detail-icon">👥</span>
                  <div className="detail-content">
                    <div className="detail-label">Participantes</div>
                    <div className="detail-value">
                      {eventoSeleccionado.participantes || 'Aún no hay participantes'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mapa */}
              <div className="modal-mapa-container">
                <div className="mapa-header">
                  <span className="mapa-icon">🗺️</span>
                  <h4>Ubicación del Evento</h4>
                </div>
                <div className="mapa-content">
                  {isLoaded && (
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={{ 
                        lat: eventoSeleccionado.latitud, 
                        lng: eventoSeleccionado.longitud 
                      }}
                      zoom={15}
                    >
                      <Marker
                        position={{ 
                          lat: eventoSeleccionado.latitud, 
                          lng: eventoSeleccionado.longitud 
                        }}
                      />
                    </GoogleMap>
                  )}
                </div>
              </div>

              {/* Botón Unirse */}
              <div className="modal-unirse">
                <button
                  className="btn-unirse"
                  onClick={() => unirseEvento(eventoSeleccionado.evento_id)}
                >
                  ✅ Unirse al evento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Eventos;
