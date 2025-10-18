// CrearEvento.tsx
import React, { useState, useCallback, useRef } from "react";
import { GoogleMap, useLoadScript, Marker, StandaloneSearchBox } from "@react-google-maps/api";
import './CrearEvento.css';

const libraries: ("places")[] = ["places"];
const mapContainerStyle = { width: "100%", height: "400px" };
const center = { lat: -33.456789, lng: -70.648273 }; // Santiago

interface EventoForm {
  nombre: string;
  descripcion: string;
  fecha_hora: string;
  lugar: string;
  max_participantes: number;
  grupo_id: number;
  precio: number;
}

// Lista de grupos con su número y nombre
const grupos: { id: number; nombre: string }[] = [
  { id: 1, nombre: "Básquetbol" },
  { id: 2, nombre: "Fútbol" },
  { id: 3, nombre: "Padel" },
  { id: 4, nombre: "Running" },
  { id: 5, nombre: "Tenis" },
  { id: 6, nombre: "Voleibol" },
];

const CrearEvento: React.FC = () => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: "AIzaSyARn1iesZ0davsL71G7SEvuonnbR13XCZE",
    libraries,
  });

  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState<EventoForm>({
    nombre: "",
    descripcion: "",
    fecha_hora: "",
    lugar: "",
    max_participantes: 10,
    grupo_id: 1,
    precio: 0,
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);

  // Calcular la fecha mínima (4 horas más que la actual)
  const now = new Date();
  now.setHours(now.getHours() + 4);
  const minDateTime = now.toISOString().slice(0, 16); // formato compatible con datetime-local

  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setMarker({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    }
  }, []);

  const handlePlaceChanged = () => {
    const places = searchBoxRef.current?.getPlaces();
    if (places && places.length > 0) {
      const place = places[0];
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setMarker({ lat, lng });
        setForm({ ...form, lugar: place.formatted_address || "" });
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    let value: string | number = e.target.value;
    if (["grupo_id", "max_participantes", "precio"].includes(e.target.name)) {
      value = parseInt(value);
    }
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marker) {
      showNotification('warning', "Selecciona la ubicación en el mapa o busca una dirección");
      return;
    }

    // Validación de precio
    if (form.precio < 0 || form.precio > 10000) {
      showNotification('error', "El precio debe ser entre 0 y 10,000");
      return;
    }

    // Validación de fecha mínima (4 horas después)
    const selectedDate = new Date(form.fecha_hora);
    const currentDate = new Date();
    currentDate.setHours(currentDate.getHours() + 4);

    if (selectedDate < currentDate) {
      showNotification('error', "La fecha del evento debe ser al menos 4 horas después de la hora actual");
      return;
    }

    const payload = {
      ...form,
      latitud: marker.lat,
      longitud: marker.lng,
    };

    try {
      const res = await fetch("http://localhost:8000/eventos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        showNotification('success', "🎉 Evento creado exitosamente!");
        setForm({
          nombre: "",
          descripcion: "",
          fecha_hora: "",
          lugar: "",
          max_participantes: 10,
          grupo_id: 1,
          precio: 0,
        });
        setMarker(null);
      } else {
        showNotification('error', "❌ Error creando evento: " + JSON.stringify(data));
      }
    } catch (err) {
      console.error(err);
      showNotification('error', "❌ Error creando evento, revisa la consola");
    }
  };

  if (loadError) return (
    <div className="crear-evento-container">
      <div className="evento-wrapper">
        <div className="error-state">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h3>Error cargando el mapa</h3>
            <p>Por favor, verifica tu conexión a internet</p>
          </div>
        </div>
      </div>
    </div>
  );

  if (!isLoaded) return (
    <div className="crear-evento-container">
      <div className="evento-wrapper">
        <div className="loading-state">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <h3>Cargando mapa...</h3>
            <p>Preparando la creación de eventos</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="crear-evento-container">
      <div className="evento-wrapper">
        <div className="evento-header">
          <div className="header-content">
            <h2>Crear Evento Deportivo</h2>
            <p className="evento-subtitle">
              Organiza tu evento deportivo y comparte cada detalle con la comunidad!
            </p>
          </div>
        </div>

        <div className="evento-main">
          <div className="evento-content">
            {notification && (
              <div className={`notification ${notification.type}`}>
                <span>{notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : '⚠️'}</span>
                {notification.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="evento-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="nombre">Nombre del Evento</label>
                  <input
                    type="text"
                    id="nombre"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Partido de Fútbol Semanal"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="grupo_id">Deporte</label>
                  <select
                    id="grupo_id"
                    name="grupo_id"
                    value={form.grupo_id}
                    onChange={handleChange}
                    required
                  >
                    {grupos.map(grupo => (
                      <option key={grupo.id} value={grupo.id}>
                        {grupo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="fecha_hora">Fecha y Hora</label>
                  <input
                    type="datetime-local"
                    id="fecha_hora"
                    name="fecha_hora"
                    value={form.fecha_hora}
                    onChange={handleChange}
                    min={minDateTime}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="max_participantes">Máximo de Participantes</label>
                  <input
                    type="number"
                    id="max_participantes"
                    name="max_participantes"
                    value={form.max_participantes}
                    onChange={handleChange}
                    min={1}
                    max={100}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="precio">Precio o Cuota por participante</label>
                  <input
                    type="number"
                    id="precio"
                    name="precio"
                    value={form.precio}
                    onChange={handleChange}
                    min={0}
                    max={10000}
                    step={100}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="lugar">Lugar</label>
                  <input
                    type="text"
                    id="lugar"
                    name="lugar"
                    value={form.lugar}
                    onChange={handleChange}
                    placeholder="Dirección o nombre del lugar"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="descripcion">Descripción del Evento</label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    placeholder="Describe el evento, requisitos, nivel de dificultad, equipamiento necesario..."
                    required
                  />
                </div>

                <div className="search-box-container">
                  <h3>🔍 Buscar ubicación en el mapa</h3>
                  <StandaloneSearchBox
                    onLoad={ref => (searchBoxRef.current = ref)}
                    onPlacesChanged={handlePlaceChanged}
                  >
                    <input
                      type="text"
                      placeholder="Escribe la dirección para buscar en el mapa..."
                      className="search-box-input"
                    />
                  </StandaloneSearchBox>
                </div>

                <div className="mapa-container">
                  <div className="mapa-header">
                    <h3>📍 Selecciona la ubicación en el mapa</h3>
                    <p className="mapa-subtitle">
                      Haz clic en el mapa para marcar la ubicación exacta del evento
                    </p>
                  </div>
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    zoom={14}
                    center={marker || center}
                    onClick={handleMapClick}
                  >
                    {marker && <Marker position={marker} />}
                  </GoogleMap>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary">
                    🎯 Crear Evento
                  </button>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => {
                      setForm({
                        nombre: "",
                        descripcion: "",
                        fecha_hora: "",
                        lugar: "",
                        max_participantes: 10,
                        grupo_id: 1,
                        precio: 0,
                      });
                      setMarker(null);
                      showNotification('success', "Formulario limpiado correctamente");
                    }}
                  >
                    🗑️ Limpiar Formulario
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrearEvento;
