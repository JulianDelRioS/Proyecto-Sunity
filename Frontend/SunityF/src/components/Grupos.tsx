import React, { useEffect, useState } from 'react';
import './Styles/Grupos.css';

interface Grupo {
  id: number;
  nombre: string;
  descripcion: string;
}

interface GruposProps {
  onVerEventos: (grupoId: number) => void;
}

const Grupos: React.FC<GruposProps> = ({ onVerEventos }) => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mapeo de cada deporte a su emoji
  const deporteEmojis: Record<string, string> = {
    "Fútbol": "⚽",
    "Básquetbol": "🏀",
    "Running": "👟",
    "Padel": "🥎",
    "Voleibol": "🏐",
    "Tenis": "🥎",
  };

  useEffect(() => {
    const fetchGrupos = async () => {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:8000/grupos");
        if (!res.ok) throw new Error("Error al obtener los grupos");
        const data = await res.json();
        setGrupos(data.grupos);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGrupos();
  }, []);

  if (loading) return (
    <div className="fullscreen-loading">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <h2>Cargando grupos deportivos</h2>
        <p>Estamos preparando todo para ti...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="fullscreen-error">
      <div className="error-content">
        <div className="error-icon">⚠️</div>
        <h2>Error al cargar los grupos</h2>
        <p>{error}</p>
        <div className="error-actions">
          <button className="btn-primary" onClick={() => window.location.reload()}>
            Reintentar
          </button>
          <button className="btn-secondary" onClick={() => setError(null)}>
            Volver atrás
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fullscreen-container">
      <div className="grupos-wrapper">
        <header className="grupos-header">
          <div className="header-content">
            <h1>Grupos Deportivos</h1>
            <p className="grupos-subtitle">
              Descubre nuestros grupos deportivos especializados
            </p>
          </div>
          <div className="header-stats">
            <span className="stat-badge">
              {grupos.length} {grupos.length === 1 ? 'grupo disponible' : 'grupos disponibles'}
            </span>
          </div>
        </header>
        
        <main className="grupos-main">
          <div className="grupos-content">
            {grupos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏃‍♂️</div>
                <h3>No hay grupos disponibles</h3>
                <p>Próximamente se agregarán nuevos grupos deportivos</p>
                <button className="btn-primary" onClick={() => window.location.reload()}>
                  Actualizar
                </button>
              </div>
            ) : (
              <div className="grupos-grid">
                {grupos.map((grupo) => (
                  <div key={grupo.id} className="grupo-card">
                    <div className="card-header">
                      <div className="grupo-icon">
                        {deporteEmojis[grupo.nombre] || "🏃‍♂️"}
                      </div>
                      <h3 className="grupo-title">{grupo.nombre}</h3>
                    </div>
                    <p className="grupo-descripcion">{grupo.descripcion}</p>
                    <div className="card-actions">
                      <button className="btn-primary" onClick={() => onVerEventos(grupo.id)}>
                        Ver eventos
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Grupos;
