const responderError = require('../responderError');

/**
 * Adaptador Primario: MultimediaController (HU8)
 * Foto de perfil y certificados. Delega la lógica de negocio a ServicioMultimedia.
 */
class MultimediaController {
  constructor(servicioMultimedia) {
    if (!servicioMultimedia) throw new Error('servicioMultimedia es requerido en MultimediaController');
    this.servicioMultimedia = servicioMultimedia;
  }

  /** GET /api/multimedia */
  async obtener(req, res) {
    try {
      const data = await this.servicioMultimedia.obtenerMultimedia(req.user);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /** PUT /api/multimedia/foto (multipart, campo "foto") */
  async actualizarFoto(req, res) {
    try {
      const data = await this.servicioMultimedia.actualizarFotoPerfil(req.user, req.file);
      return res.status(200).json({ success: true, message: 'Foto de perfil actualizada.', data });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /** POST /api/multimedia/certificados (multipart, campo "archivo" + datos del formulario) */
  async subirCertificado(req, res) {
    try {
      const data = await this.servicioMultimedia.subirCertificado(req.user, req.body || {}, req.file);
      return res.status(201).json({ success: true, message: 'Certificado registrado. Quedará pendiente de revisión.', data });
    } catch (error) {
      return responderError(res, error);
    }
  }

  /** DELETE /api/multimedia/certificados/:id */
  async eliminarCertificado(req, res) {
    try {
      await this.servicioMultimedia.eliminarCertificado(req.user, Number(req.params.id));
      return res.status(200).json({ success: true, message: 'Certificado eliminado.' });
    } catch (error) {
      return responderError(res, error);
    }
  }
}

module.exports = MultimediaController;
