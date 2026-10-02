-- ==========================================================
-- PROYECTO: Mi Nana (Ingeniería de Software)
-- Base de Datos: BD_NannyApp (PostgreSQL)
-- Basado en: Figura 36 - Diagrama de Base de Datos - Sprint 1
-- ==========================================================

-- Tabla de Usuarios generales (Padres, Niñeras, Administradores)
CREATE TABLE IF NOT EXISTS Usuario (
    ID_Usuario SERIAL PRIMARY KEY,
    Nombre_Usuario VARCHAR(100) NOT NULL,
    Apellido_Usuario VARCHAR(100) NOT NULL,
    Correo_Electronico VARCHAR(150) UNIQUE NOT NULL,
    DNI VARCHAR(20) UNIQUE,
    Contrasena VARCHAR(255) NOT NULL,
    Celular VARCHAR(20),
    TipoUsuario VARCHAR(30) NOT NULL CHECK (TipoUsuario IN ('Padre', 'Ninera', 'Admin')),
    Fecha_Registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Perfil específico de Padre / Familia
CREATE TABLE IF NOT EXISTS Padre (
    ID_Padre INT PRIMARY KEY REFERENCES Usuario(ID_Usuario) ON DELETE CASCADE,
    Direccion VARCHAR(255),
    Numero_Hijos INT DEFAULT 0
);

-- Perfil específico de Niñera
CREATE TABLE IF NOT EXISTS Ninera (
    ID_Ninera INT PRIMARY KEY REFERENCES Usuario(ID_Usuario) ON DELETE CASCADE,
    Zona VARCHAR(100),
    Experiencia TEXT,
    Tarifa_Hora DECIMAL(10, 2) NOT NULL,
    Descripcion TEXT,
    Verificada BOOLEAN DEFAULT FALSE,
    Calificacion_Promedio DECIMAL(3, 2) DEFAULT 5.0
);

-- Tabla de Hijos asociados a una Familia
CREATE TABLE IF NOT EXISTS Hijo (
    ID_Hijo SERIAL PRIMARY KEY,
    ID_Padre INT NOT NULL REFERENCES Padre(ID_Padre) ON DELETE CASCADE,
    Nombre_Hijo VARCHAR(100) NOT NULL,
    Edad INT NOT NULL,
    Alergias TEXT,
    Condiciones_Medicas TEXT,
    Notas TEXT
);

-- Disponibilidad de las Niñeras
CREATE TABLE IF NOT EXISTS Disponibilidad (
    ID_Disponibilidad SERIAL PRIMARY KEY,
    ID_Ninera INT NOT NULL REFERENCES Ninera(ID_Ninera) ON DELETE CASCADE,
    Fecha DATE,
    Dia_Semana VARCHAR(20),
    Hora_Inicio TIME NOT NULL,
    Hora_Fin TIME NOT NULL,
    Estado VARCHAR(30) DEFAULT 'Disponible'
);

-- Reservas de cuidado infantil
CREATE TABLE IF NOT EXISTS Reserva (
    ID_Reserva SERIAL PRIMARY KEY,
    ID_Padre INT NOT NULL REFERENCES Padre(ID_Padre),
    ID_Ninera INT NOT NULL REFERENCES Ninera(ID_Ninera),
    ID_Hijo INT REFERENCES Hijo(ID_Hijo),
    Fecha_Reserva DATE NOT NULL,
    Hora_Inicio TIME NOT NULL,
    Hora_Fin TIME NOT NULL,
    Direccion VARCHAR(255) NOT NULL,
    Estado_Reserva VARCHAR(30) DEFAULT 'Pendiente',
    Comentario TEXT
);

-- Valoraciones y reseñas
CREATE TABLE IF NOT EXISTS Valoracion (
    ID_Valoracion SERIAL PRIMARY KEY,
    ID_Reserva INT UNIQUE REFERENCES Reserva(ID_Reserva),
    ID_Padre INT NOT NULL REFERENCES Padre(ID_Padre),
    ID_Ninera INT NOT NULL REFERENCES Ninera(ID_Ninera),
    Calificacion INT CHECK (Calificacion >= 1 AND Calificacion <= 5),
    Comentario TEXT,
    Fecha_Valoracion DATE DEFAULT CURRENT_DATE
);

-- Niñeras Favoritas marcadas por Padres
CREATE TABLE IF NOT EXISTS Favorito (
    ID_Favorito SERIAL PRIMARY KEY,
    ID_Padre INT NOT NULL REFERENCES Padre(ID_Padre) ON DELETE CASCADE,
    ID_Ninera INT NOT NULL REFERENCES Ninera(ID_Ninera) ON DELETE CASCADE,
    Fecha_Agregado DATE DEFAULT CURRENT_DATE,
    UNIQUE(ID_Padre, ID_Ninera)
);

-- Mensajería interna entre usuarios
CREATE TABLE IF NOT EXISTS Mensaje (
    ID_Mensaje SERIAL PRIMARY KEY,
    ID_Usuario_Emisor INT NOT NULL REFERENCES Usuario(ID_Usuario),
    ID_Usuario_Receptor INT NOT NULL REFERENCES Usuario(ID_Usuario),
    Fecha_Creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Asunto VARCHAR(150),
    Contenido TEXT NOT NULL
);
