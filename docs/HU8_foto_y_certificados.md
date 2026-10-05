# HU8: Foto de perfil y certificados

> Como usuario (niñera o familia), quiero cargar y actualizar mi foto de perfil y certificados mediante almacenamiento en la nube para generar confianza.

## Qué hace

- **Foto de perfil** (familia y niñera): JPG, PNG o WEBP de hasta 2 MB. Es pública y se muestra en el panel.
- **Certificados** (solo niñera): PDF, JPG o PNG de hasta 5 MB, máximo 10 por niñera. Son **privados** en Cloudinary y solo se abren con enlaces que expiran en 10 minutos. Quedan en estado `PENDIENTE` hasta que el administrador los revise (HU9).
- El backend revisa los primeros bytes del archivo, no solo la extensión, para que no se pueda subir otro tipo de archivo renombrado.

## Cómo ponerlo en marcha

1. **Base de datos (una sola vez, la hace una persona del equipo):** abre el SQL Editor de Neon y ejecuta `database/migrations/001_hu8_multimedia.sql`. Agrega `foto_url` y `foto_public_id` a `usuario` y crea la tabla `certificado`. Se puede ejecutar de nuevo sin problema.
2. **Cloudinary:** crea una cuenta gratuita y copia los datos de *Settings > API Keys* en `backend/.env`:
   ```
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```
   Estas claves van solo en el `.env`, nunca en el código ni en el chat del grupo. Sin ellas el backend arranca igual, pero subir archivos responde 503.
   Si un PDF no abre, activa *Settings > Security > Allow delivery of PDF and ZIP files*.
3. **Dependencias:** `npm install` dentro de `backend` y dentro de `frontend` (se agregaron `cloudinary`, `multer`, `jest`, `expo-image-picker` y `expo-document-picker`).
4. **Celular con Expo Go:** copia `frontend/.env.example` como `frontend/.env` y pon la IP de tu PC en `EXPO_PUBLIC_API_URL`. Todas las pantallas toman la URL de `src/config/api.js`.
5. **Prisma:** `backend/prisma/schema.prisma` ya incluye `foto_url`, `foto_public_id` y el modelo `Certificado`, así que un `prisma db push` no borra la tabla. El repositorio de HU8 usa el pool de `pg` en los dos modos (`USE_PRISMA` true o false).

## Endpoints (`/api/multimedia`, todos con `Authorization: Bearer <token>`)

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| GET | `/` | | `{ fotoUrl, certificados[] }` |
| PUT | `/foto` | multipart, campo `foto` | `{ fotoUrl }` |
| POST | `/certificados` | multipart: `tipo`, `nombre`, `institucion`, `fechaEmision`, `fechaVencimiento` (opcional), `archivo` | certificado creado (201) |
| DELETE | `/certificados/:id` | | 200 |

Errores de validación: 400 con `fields: { campo: mensaje }`. Una familia que intenta subir certificados recibe 403.

## Diseño (arquitectura hexagonal, igual que el resto del backend)

| Capa | Clase | Responsabilidad |
|---|---|---|
| Dominio | `Certificado` | Entidad; `perteneceA(idNinera)` |
| Dominio | `ValidadorMultimedia` | Reglas puras de archivos, fechas y formulario |
| Aplicación | `ServicioMultimedia` | Casos de uso: foto, subir, listar y eliminar certificados |
| Aplicación (puertos) | `AlmacenamientoArchivosPort`, `MultimediaRepositoryPort` | Abstracciones de las que depende el servicio |
| Infraestructura | `CloudinaryAlmacenamiento`, `PostgresMultimediaRepository` | Adaptadores concretos |
| Infraestructura | `MultimediaController`, `subidaArchivo` (multer), `multimedia.routes` | Entrada HTTP |
| Frontend | `MultimediaScreen` | Pantalla de foto y certificados |

Principios y patrones del curso aplicados (detalle en el material del informe):
- **SOLID** completo, en especial **DIP**: `ServicioMultimedia` depende de puertos, no de Cloudinary ni PostgreSQL.
- **Adapter** (semana 4): `CloudinaryAlmacenamiento` (Adapter) adapta el SDK de Cloudinary (Adaptee) a `AlmacenamientoArchivosPort` (Target) para `ServicioMultimedia` (Client).
- **Facade** (semana 4): `ServicioMultimedia` ofrece al controlador un solo método por caso de uso.
- **Singleton** (semana 3): `container.js` exporta una única instancia que crea e inyecta las dependencias.
- **DRY y Ley de Demeter** (semana 2): `responderError()` compartido; `certificado.perteneceA(id)`.
- **Transacción compensatoria:** si la base de datos falla después de subir el archivo, el servicio lo borra de Cloudinary para no dejar archivos huérfanos.

## Pruebas

```
cd backend
npm test
```
`tests/ValidadorMultimedia.test.js` (caja blanca de `validarArchivo` y reglas del formulario) y `tests/ServicioMultimedia.test.js` (prueba unitaria con dobles). No usan Neon ni Cloudinary.
