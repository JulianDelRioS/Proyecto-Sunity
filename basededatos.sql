CREATE TABLE usuarios (
    google_id VARCHAR(255) PRIMARY KEY,   -- PK: Google ID único e inmutable
    email VARCHAR(150) UNIQUE NOT NULL,   -- Correo del usuario
    nombre VARCHAR(100) NOT NULL,         -- Nombre completo del usuario
    foto_perfil TEXT,                     -- URL de la foto de perfil (opcional)
    telefono CHAR(9),                     -- Número de teléfono chileno (9 dígitos)
    region VARCHAR(100),                  -- Región del usuario
    comuna VARCHAR(100),                  -- Comuna del usuario
    deporte_favorito VARCHAR(50),
    edad INTEGER,
    descripcion TEXT,    
    universidad_o_instituto VARCHAR(150),  -- Universidad o Instituto profesional
    carrera VARCHAR(100),                   -- Carrera que estudia o estudió
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



CREATE TABLE grupos_deportivos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,  -- Ej: "Fútbol", "Básquetbol", "Running"
    descripcion TEXT                      -- Opcional, para detallar el grupo
);


CREATE TABLE eventos_deportivos (
    id SERIAL PRIMARY KEY,
    grupo_id INT REFERENCES grupos_deportivos(id) ON DELETE CASCADE, -- Evento pertenece a un grupo
    anfitrion_id VARCHAR(255) REFERENCES usuarios(google_id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,      -- Nombre del evento
    descripcion TEXT,                  -- Descripción del evento
    fecha_hora TIMESTAMP NOT NULL,     -- Fecha y hora del evento
    lugar VARCHAR(200),                -- Nombre del lugar (ej: "Parque O'Higgins")
    latitud DECIMAL(9,6),              -- Latitud para Google Maps
    longitud DECIMAL(9,6),             -- Longitud para Google Maps
    max_participantes INT NOT NULL,    -- Cantidad máxima de participantes
    precio INT NOT NULL                -- Precio del evento (entero, en pesos por ejemplo)
);

CREATE TABLE usuarios_eventos (
    id SERIAL PRIMARY KEY,
    usuario_id VARCHAR(255) REFERENCES usuarios(google_id) ON DELETE CASCADE, -- Usuario que se une
    evento_id INT REFERENCES eventos_deportivos(id) ON DELETE CASCADE,        -- Evento al que se une
    fecha_union TIMESTAMP DEFAULT CURRENT_TIMESTAMP                           -- Fecha de inscripción al evento
);



-- Tabla de amistades confirmadas
CREATE TABLE amigos (
    id SERIAL PRIMARY KEY,
    usuario_id VARCHAR(255) NOT NULL REFERENCES usuarios(google_id) ON DELETE CASCADE,
    amigo_id VARCHAR(255) NOT NULL REFERENCES usuarios(google_id) ON DELETE CASCADE,
    fecha_amistad TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_amistad_propia CHECK (usuario_id <> amigo_id)
);

-- Índice único para evitar duplicados invertidos
CREATE UNIQUE INDEX amigos_unico_idx 
ON amigos (LEAST(usuario_id, amigo_id), GREATEST(usuario_id, amigo_id));

-- Tabla de solicitudes de amistad
CREATE TABLE solicitudes_amistad (
    id SERIAL PRIMARY KEY,
    solicitante_id VARCHAR(255) NOT NULL REFERENCES usuarios(google_id) ON DELETE CASCADE,
    destinatario_id VARCHAR(255) NOT NULL REFERENCES usuarios(google_id) ON DELETE CASCADE,
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',  -- pendiente, aceptada, rechazada
    fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_respuesta TIMESTAMP,
    CONSTRAINT solicitud_unica UNIQUE (solicitante_id, destinatario_id),
    CONSTRAINT no_solicitud_propia CHECK (solicitante_id <> destinatario_id)
);



CREATE TABLE mensajes_amigos (
    id SERIAL PRIMARY KEY,
    remitente_id VARCHAR(255) NOT NULL REFERENCES usuarios(google_id) ON DELETE CASCADE,
    destinatario_id VARCHAR(255) NOT NULL REFERENCES usuarios(google_id) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mensajes_amigos_pair 
ON mensajes_amigos (LEAST(remitente_id, destinatario_id), GREATEST(remitente_id, destinatario_id));


CREATE TABLE mensajes_eventos (
    id SERIAL PRIMARY KEY,
    evento_id INT NOT NULL REFERENCES eventos_deportivos(id) ON DELETE CASCADE,
    remitente_id VARCHAR(255) NOT NULL REFERENCES usuarios(google_id) ON DELETE CASCADE,
    mensaje TEXT NOT NULL,
    fecha_envio TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para acelerar las consultas por evento y fecha
CREATE INDEX idx_mensajes_eventos_evento
ON mensajes_eventos (evento_id, fecha_envio);

CREATE TABLE calificaciones_usuarios (
    id SERIAL PRIMARY KEY,
    evaluador_id VARCHAR(255) REFERENCES usuarios(google_id) ON DELETE CASCADE,  -- quien califica (puede ser NULL si es el sistema)
    evaluado_id VARCHAR(255) NOT NULL REFERENCES usuarios(google_id) ON DELETE CASCADE,  -- quien recibe la calificación
    estrellas INTEGER NOT NULL CHECK (estrellas BETWEEN 1 AND 5),  -- de 1 a 5 estrellas
    tipo VARCHAR(20) NOT NULL DEFAULT 'usuario',  -- 'usuario' o 'sistema'
    motivo VARCHAR(100),  -- ejemplo: 'abandono_evento', 'cancelacion_evento'
    fecha_calificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_auto_calificacion CHECK (
        evaluador_id IS NULL OR evaluador_id <> evaluado_id
    )
);















