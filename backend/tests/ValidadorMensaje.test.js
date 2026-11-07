const {
  validarEnvioMensaje,
  MAX_LONGITUD_MENSAJE,
} = require('../src/domain/validators/ValidadorMensaje');

describe('ValidadorMensaje (HU17)', () => {
  it('valida con éxito un mensaje correcto', () => {
    const errores = validarEnvioMensaje({
      idEmisor: 1,
      idReceptor: 2,
      contenido: 'Hola, ¿puedes cuidar a mis hijos mañana?',
    });
    expect(Object.keys(errores).length).toBe(0);
  });

  it('rechaza mensaje con contenido vacío o solo espacios', () => {
    const errores = validarEnvioMensaje({
      idEmisor: 1,
      idReceptor: 2,
      contenido: '    ',
    });
    expect(errores.contenido).toBe('El mensaje no puede estar vacío.');
  });

  it('rechaza mensaje sin contenido (null o undefined)', () => {
    const errores = validarEnvioMensaje({
      idEmisor: 1,
      idReceptor: 2,
    });
    expect(errores.contenido).toBe('El contenido del mensaje es obligatorio.');
  });

  it('rechaza mensaje que excede el límite de caracteres', () => {
    const textoLargo = 'a'.repeat(MAX_LONGITUD_MENSAJE + 1);
    const errores = validarEnvioMensaje({
      idEmisor: 1,
      idReceptor: 2,
      contenido: textoLargo,
    });
    expect(errores.contenido).toContain(`no puede exceder los ${MAX_LONGITUD_MENSAJE} caracteres`);
  });

  it('rechaza emisor inválido', () => {
    const errores = validarEnvioMensaje({
      idEmisor: 'invalido',
      idReceptor: 2,
      contenido: 'Hola',
    });
    expect(errores.idEmisor).toBeDefined();
  });

  it('rechaza cuando el emisor y receptor son el mismo usuario', () => {
    const errores = validarEnvioMensaje({
      idEmisor: 5,
      idReceptor: 5,
      contenido: 'Mensaje para mí mismo',
    });
    expect(errores.idReceptor).toBe('No es posible enviarse un mensaje a sí mismo.');
  });
});
