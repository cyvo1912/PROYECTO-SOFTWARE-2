let cloudinary = null;
try {
  cloudinary = require('cloudinary').v2;
} catch (e) {
  cloudinary = null;
}

const AlmacenamientoArchivosPort = require('../../../application/ports/AlmacenamientoArchivosPort');
const { ServiceUnavailableError } = require('../../../domain/errors/DomainErrors');

/**
 * Adaptador Secundario: almacenamiento en Cloudinary (HU8)
 * Implementa AlmacenamientoArchivosPort. Las credenciales se leen solo del .env.
 *
 * - Fotos: tipo 'upload' (públicas).
 * - Certificados: tipo 'private'; se descargan con enlaces firmados que expiran.
 */
class CloudinaryAlmacenamiento extends AlmacenamientoArchivosPort {
  constructor(env = process.env) {
    super();
    this.configurado = Boolean(
      cloudinary &&
      env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET
    );
    if (this.configurado && cloudinary) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
  }

  async subir(archivo, { carpeta, privado }) {
    this._verificarConfiguracion();
    const resultado = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: carpeta,
          resource_type: 'auto',
          type: privado ? 'private' : 'upload',
        },
        (error, respuesta) => (error ? reject(error) : resolve(respuesta)),
      );
      stream.end(archivo.buffer);
    });

    return {
      url: privado ? null : resultado.secure_url,
      publicId: resultado.public_id,
      formato: resultado.format,
      tipoRecurso: resultado.resource_type,
      privado,
    };
  }

  async eliminar({ publicId, tipoRecurso, privado }) {
    this._verificarConfiguracion();
    await cloudinary.uploader.destroy(publicId, {
      resource_type: tipoRecurso || 'image',
      type: privado ? 'private' : 'upload',
      invalidate: true,
    });
  }

  generarUrlTemporal({ publicId, formato, tipoRecurso }, segundos) {
    if (!this.configurado) return null;
    return cloudinary.utils.private_download_url(publicId, formato, {
      resource_type: tipoRecurso || 'image',
      type: 'private',
      expires_at: Math.floor(Date.now() / 1000) + segundos,
    });
  }

  _verificarConfiguracion() {
    if (!cloudinary) {
      throw new ServiceUnavailableError(
        'El paquete "cloudinary" no está instalado en node_modules del backend. Ejecuta "npm install" en la carpeta backend.',
      );
    }
    if (!this.configurado) {
      throw new ServiceUnavailableError(
        'El almacenamiento de archivos no está configurado. Agrega las variables CLOUDINARY_* al .env del backend.',
      );
    }
  }
}

module.exports = CloudinaryAlmacenamiento;
