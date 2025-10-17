// src/components/CalendarioGigante.tsx
import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import "./CalendarioGigante.css";

interface Evento {
  id: string;
  title: string;
  start: string;
  description?: string;
  tipo?: string; // 'anfitrion' o 'participante'
  lugar?: string;
  latitud?: number;
  longitud?: number;
  precio?: number;
  participantes?: string; // Ej: "3 / 10"
}

const CalendarioGigante: React.FC = () => {
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: "AIzaSyARn1iesZ0davsL71G7SEvuonnbR13XCZE"
  });

  useEffect(() => {
    const fetchEventos = async () => {
      try {
        const response = await fetch("http://localhost:8000/mis-eventos", {
          credentials: "include",
        });
        const data = await response.json();

        if (data.ok) {
          const eventosFormateados: Evento[] = data.eventos.map((e: any) => ({
            id: e.evento_id.toString(),
            title: e.nombre,
            start: e.fecha_hora,
            description: e.descripcion ?? "Sin descripción",
            tipo: e.tipo ?? "participante",
            lugar: e.lugar ?? "Lugar no disponible",
            latitud: e.latitud ?? 0,
            longitud: e.longitud ?? 0,
            precio: e.precio ?? 0,
            participantes: `${e.inscritos ?? 0} / ${e.max_participantes ?? 0}`,
          }));
          setEventos(eventosFormateados);
        } else {
          console.error("Error cargando eventos:", data);
        }
      } catch (err) {
        console.error("Error conectando al backend:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventos();
  }, []);

  const handleEventClick = (clickInfo: EventClickArg) => {
    const evento = eventos.find((e) => e.id === clickInfo.event.id);
    setEventoSeleccionado(evento ?? null);
  };

  const formatearFecha = (fecha?: string) => {
    if (!fecha) return "Fecha no disponible";
    return new Date(fecha).toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatearHora = (fecha?: string) => {
    if (!fecha || !fecha.includes("T")) return "Horario por confirmar";
    return new Date(fecha).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const obtenerClaseEvento = (tipo?: string) => {
    switch (tipo) {
      case "anfitrion":
        return "fc-event-anfitrion";
      case "participante":
        return "fc-event-participante";
      default:
        return "";
    }
  };

  // Función para unirse a un evento
  const unirseEvento = async (eventoId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/eventos/${eventoId}/unirse`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Error al unirse al evento");

      alert(data.message);

      // Actualizar número de participantes en el modal y en la lista
      setEventoSeleccionado((prev) =>
        prev
          ? { 
              ...prev, 
              participantes: `${data.participantes_actuales} / ${data.max_participantes}` 
            }
          : prev
      );
      setEventos((prev) =>
        prev.map((e) =>
          e.id === eventoId
            ? { 
                ...e, 
                participantes: `${data.participantes_actuales} / ${data.max_participantes}` 
              }
            : e
        )
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return (
    <div className="calendario-container">
      <div className="calendario-wrapper">
        <div className="loading-state">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h3>Cargando Calendario</h3>
            <p>Obteniendo tus eventos...</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="calendario-container">
      <div className="calendario-wrapper">
        <div className="calendario-header">
          <div className="header-content">
            <h2 className="titulo-calendario">Mis Eventos</h2>
            <p className="calendario-subtitle">
              Mantente al día con todos tus eventos y actividades
            </p>
          </div>
          <div className="header-stats">
            <div className="stat-badge">{eventos.length} Eventos Programados</div>
          </div>
        </div>

        <div className="calendario-main">
          <div className="calendario-content">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              height="auto"
              events={eventos.map((evento) => ({
                ...evento,
                className: obtenerClaseEvento(evento.tipo),
              }))}
              eventClick={handleEventClick}
              headerToolbar={{
                left: "prev,next",
                center: "title",
                right: "dayGridMonth,dayGridWeek,dayGridDay",
              }}
              buttonText={{ today: "Hoy", month: "Mes", week: "Semana", day: "Día" }}
              locale="es"
              firstDay={1}
            />
          </div>
        </div>
      </div>

      {eventoSeleccionado && (
        <div className="modal" onClick={() => setEventoSeleccionado(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <button
                className="btn-cerrar"
                onClick={() => setEventoSeleccionado(null)}
                aria-label="Cerrar modal"
              >
                ×
              </button>
              <h3>{eventoSeleccionado.title ?? "Evento"}</h3>
              <div className="evento-badge">
                {eventoSeleccionado.tipo
                  ? eventoSeleccionado.tipo.charAt(0).toUpperCase() +
                    eventoSeleccionado.tipo.slice(1)
                  : "Evento"}
              </div>
            </div>

            <div className="modal-body">
              <div className="modal-detail">
                <span className="detail-icon">📅</span>
                <div className="detail-content">
                  <div className="detail-label">Fecha del Evento</div>
                  <div className="detail-value">{formatearFecha(eventoSeleccionado.start)}</div>
                </div>
              </div>

              <div className="modal-detail">
                <span className="detail-icon">⏰</span>
                <div className="detail-content">
                  <div className="detail-label">Hora</div>
                  <div className="detail-value">{formatearHora(eventoSeleccionado.start)}</div>
                </div>
              </div>

              <div className="modal-detail">
                <span className="detail-icon">📍</span>
                <div className="detail-content">
                  <div className="detail-label">Lugar</div>
                  <div className="detail-value">{eventoSeleccionado.lugar ?? "No disponible"}</div>
                </div>
              </div>

              <div className="modal-detail">
                <span className="detail-icon">💰</span>
                <div className="detail-content">
                  <div className="detail-label">Precio</div>
                  <div className="detail-value">
                    {eventoSeleccionado.precio === 0 ? 'Gratuito' : `$${eventoSeleccionado.precio}`}
                  </div>
                </div>
              </div>

              <div className="modal-detail">
                <span className="detail-icon">👥</span>
                <div className="detail-content">
                  <div className="detail-label">Participantes</div>
                  <div className="detail-value">{eventoSeleccionado.participantes ?? "0 / 0"}</div>
                </div>
              </div>

              <div className="modal-detail">
                <span className="detail-icon">📝</span>
                <div className="detail-content">
                  <div className="detail-label">Descripción</div>
                  <div className="detail-value">{eventoSeleccionado.description ?? "Sin descripción"}</div>
                </div>
              </div>

              {/* Mapa de Google Maps */}
              {eventoSeleccionado.latitud && eventoSeleccionado.longitud && (
                <div className="modal-mapa-container">
                  <div className="mapa-header">
                    <span className="mapa-icon">🗺️</span>
                    <h4>Ubicación del Evento</h4>
                  </div>
                  <div className="mapa-content">
                    {isLoaded ? (
                      <GoogleMap
                        mapContainerStyle={{ 
                          width: '100%', 
                          height: '300px', 
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0'
                        }}
                        center={{ 
                          lat: eventoSeleccionado.latitud, 
                          lng: eventoSeleccionado.longitud 
                        }}
                        zoom={15}
                        options={{
                          streetViewControl: false,
                          mapTypeControl: false,
                          fullscreenControl: true,
                        }}
                      >
                        <Marker
                          position={{ 
                            lat: eventoSeleccionado.latitud, 
                            lng: eventoSeleccionado.longitud 
                          }}
                        />
                      </GoogleMap>
                    ) : (
                      <div className="mapa-loading">
                        <div className="loading-spinner-small"></div>
                        <p>Cargando mapa...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botón de acción */}
              <div className="modal-actions">
                <button 
                  className="btn-accion"
                  onClick={() => { /* aún no hace nada */ }}
                >
                  ❌ Abandonar este evento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarioGigante;