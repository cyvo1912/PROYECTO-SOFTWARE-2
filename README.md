# MiNana

Aplicación que conecta a familias con niñeras verificadas en Lima. Proyecto final del curso Ingeniería de Software II (Universidad de Lima, 2026-2), Grupo 3.

Con MiNana una familia busca niñeras cercanas, revisa su perfil público y su disponibilidad, reserva para uno de sus hijos, conversa por chat y valora el servicio. La niñera gestiona su perfil, sus certificados, sus reservas y las ofertas de trabajo. El administrador verifica a las niñeras antes de activar su cuenta.

## Contenido

1. [Tecnologías](#tecnologías)
2. [Estructura del repositorio](#estructura-del-repositorio)
3. [Requisitos](#requisitos)
4. [Base de datos](#1-base-de-datos)
5. [Backend](#2-backend-api)
6. [Frontend](#3-frontend-app)
7. [Pruebas](#pruebas)
8. [Usuarios de prueba](#usuarios-de-prueba)
9. [Historias de usuario](#historias-de-usuario)
10. [Equipo](#equipo)

## Tecnologías

| Capa | Tecnología |
|---|---|
| App (móvil y web) | React Native con Expo |
| API | Node.js, Express 5, Socket.IO |
| Base de datos | PostgreSQL en Neon |
| Archivos | Cloudinary (foto de perfil y certificados privados) |
| Seguridad | JWT y bcrypt |
| Pruebas | Jest y node:test |

El backend sigue una arquitectura hexagonal (puertos y adaptadores): `domain` no depende de nada, `application` depende de puertos y `infrastructure` implementa los adaptadores (PostgreSQL, Cloudinary, JWT, Socket.IO, HTTP).

## Estructura del repositorio

```
backend/
  server.js                 Punto de entrada (HTTP + Socket.IO)
  src/
    domain/                 Entidades, validadores, estrategias y errores
    application/            Servicios (casos de uso) y puertos
    infrastructure/         Adaptadores (BD, nube, seguridad, tiempo real) y HTTP
    routes/                 Rutas de Express
    container.js            Inyección de dependencias
  test/                     Pruebas con node:test
  tests/                    Pruebas con Jest
frontend/
  App.js                    Navegación de la app
  src/screens/              Pantallas
  src/config/api.js         URL de la API
database/
  schema.sql                Esquema base
  migrations/               Migraciones 001 a 010
docs/
  uml/                      Diagramas UML editables (PlantUML)
```

## Requisitos

- Node.js 20 o superior y npm.
- Una base de datos PostgreSQL (se usó [Neon](https://neon.tech), plan gratuito).
- Una cuenta de [Cloudinary](https://cloudinary.com) (plan gratuito) para la foto y los certificados.
- Para probar en el celular: la app Expo Go. Para probar en el navegador no hace falta nada más.

## Instalación y ejecución

### 1. Base de datos

1. Crea una base de datos PostgreSQL vacía (por ejemplo, un proyecto en Neon) y copia su cadena de conexión.
2. Ejecuta `database/schema.sql`.
3. Ejecuta las migraciones de `database/migrations/` en este orden:

```
001_hu8_multimedia.sql
002_agregar_verificada_ninera.sql
003_hu11_geolocalizacion.sql
003_hu17_chat_mensajes.sql
004_hu12_perfil_publico.sql
004_hu13_disponibilidad.sql
005_hu14_bolsa_trabajo.sql
005_hu_reservas.sql
006_hu18_notificaciones_valoraciones.sql
006_hu18_valoraciones.sql
007_hu18_dispositivo_push.sql
008_ofertas_reservas.sql
009_reservas_grupo.sql
010_tokens_revocados.sql
011_ingresos_comision.sql
010_tokens_revocados.sql
```

Con `psql` sería así (también se pueden pegar en el editor SQL de Neon):

```bash
psql "<cadena de conexión>" -f database/schema.sql
psql "<cadena de conexión>" -f database/migrations/001_hu8_multimedia.sql
# ...y así con cada migración, en el orden de la lista
```

### 2. Backend (API)

```bash
cd backend
npm install
cp .env.example .env      # en Windows: copy .env.example .env
```

Edita `backend/.env` con tus propios valores:

| Variable | Para qué sirve |
|---|---|
| `PORT` | Puerto de la API (por defecto 5000) |
| `DB` | Cadena de conexión de PostgreSQL |
| `JWT_SECRET` | Clave para firmar los tokens (usa un texto largo y aleatorio). **Obligatoria**: el servidor no arranca si falta o si usa el valor de ejemplo |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Credenciales de Cloudinary |

El archivo `.env` no se sube al repositorio. No escribas claves reales en el código ni en `.env.example`.

Inicia el servidor:

```bash
npm run dev      # reinicia solo al guardar cambios
# o
npm start
```

Para comprobar que funciona abre `http://localhost:5000/api/health`.

### 3. Frontend (app)

```bash
cd frontend
npm install
cp .env.example .env      # en Windows: copy .env.example .env
```

En `frontend/.env`:

| Variable | Para qué sirve |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL de la API. En el navegador: `http://localhost:5000/api`. En el celular: `http://<IP de tu PC>:5000/api` |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Opcional. Clave de Maps Static API para el mapa de la búsqueda. Sin ella la búsqueda funciona en modo lista |

Inicia la app:

```bash
npm run web      # abre la app en el navegador
# o
npm start        # muestra un código QR para abrirla con Expo Go
```

El celular y la PC deben estar en la misma red wifi. Las notificaciones push solo funcionan en un dispositivo físico.

## Pruebas

```bash
cd backend
npm test
```

El comando ejecuta las 325 pruebas automatizadas: 226 con node:test (`backend/test`) y 99 con Jest (`backend/tests`). Las pruebas usan dobles de los puertos, por lo que no necesitan base de datos ni Cloudinary.

Para ejecutar solo un grupo:

```bash
node --test "test/**/*.test.js"     # solo node:test
npx jest tests/                     # solo Jest
npx jest tests/ --coverage          # Jest con reporte de cobertura
```

## Usuarios de prueba

Las contraseñas no se guardan en el repositorio. Para probar el sistema crea tus propias cuentas:

| Rol | Cómo obtener la cuenta |
|---|---|
| Familia | Regístrate desde la app con el registro de familia. La cuenta queda activa de inmediato |
| Niñera | Regístrate desde la app con el registro de niñera. La cuenta queda pendiente: puede entrar con acceso limitado para subir su foto y sus certificados, y el administrador la activa después de revisarlos |
| Administrador | No hay registro público. Se crea una vez directamente en la base de datos (pasos abajo) |

Crear el administrador:

1. Genera el hash de la contraseña que quieras usar:

```bash
cd backend
node -e "console.log(require('bcryptjs').hashSync('TU_CONTRASEÑA', 10))"
```

2. Inserta el usuario con ese hash:

```sql
INSERT INTO usuario (nombre_usuario, apellido_usuario, correo, dni, contrasena_hash, tipo_usuario, estado_cuenta)
VALUES ('Admin', 'MiNana', 'admin@ejemplo.com', '00000000', '<hash generado>', 'ADMIN', 'ACTIVA');
```

Flujo sugerido para una demostración: registrar una niñera, subir su foto y sus certificados, entrar como administrador para aprobarlos y activar la cuenta, registrar una familia con un hijo, buscar a la niñera, ver su perfil público y su disponibilidad, reservar, pagar en la pasarela simulada (Tarjeta, Yape o Plin; no se cobra dinero real) dentro de los 10 minutos, entrar como niñera para aceptar la reserva, conversar por chat, completar la reserva y valorarla.

## Historias de usuario

| Release | Sprint | Historias |
|---|---|---|
| 1 | 1 | HU1 landing, HU2 registro de familia, HU3 registro de niñera, HU4 inicio y cierre de sesión, HU5 perfil de niñera, HU6 panel de familia, HU7 perfiles de hijos, HU8 foto y certificados, HU9 verificación de niñeras, HU10 usuarios y estados de cuenta |
| 2 | 2 | HU11 búsqueda por proximidad, HU12 perfil público ampliado, HU13 calendario de disponibilidad, HU14 bolsa de trabajo, HU15 reservas con cálculo de tarifa, HU16 historial y estados de reservas, HU17 chat en tiempo real, HU18 notificaciones y valoraciones |

Principales grupos de endpoints: `/api/auth`, `/api/usuarios`, `/api/hijos`, `/api/multimedia`, `/api/administracion`, `/api/busqueda`, `/api/perfil-publico`, `/api/nineras`, `/api/ofertas`, `/api/reservas`, `/api/mensajeria`, `/api/notificaciones` y `/api/valoraciones`.

## Equipo

| Integrante | Rol | Historias |
|---|---|---|
| Genessi Ávila | Product Owner | HU6, HU14 |
| Gabriel Alva | Scrum Master | HU1, HU4, HU17 |
| Christian Venegas | Desarrollador | HU2, HU3, HU11 |
| Rodrigo Soto | Desarrollador | HU5, HU13 |
| Yadhira Sarmiento | Desarrolladora | HU7, HU15 |
| Hiroshi Takeda | Desarrollador | HU8, HU12 |
| Angel Jimenez | Desarrollador | HU9, HU18 |
| Rodrigo Salazar | Desarrollador | HU10, HU16 |
