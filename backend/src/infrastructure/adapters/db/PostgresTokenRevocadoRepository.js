/**
 * Adaptador Secundario: persistencia de tokens JWT revocados (logout).
 * Guarda solo la huella SHA-256 del token, nunca el token en claro.
 */
class PostgresTokenRevocadoRepository {
  constructor(pool) {
    if (!pool) throw new Error('pool es requerido en PostgresTokenRevocadoRepository');
    this.pool = pool;
  }

  async guardar(huella, expiraEn) {
    await this.pool.query(
      `INSERT INTO token_revocado (huella_token, expira_en)
       VALUES ($1, $2)
       ON CONFLICT (huella_token) DO NOTHING;`,
      [huella, expiraEn]
    );
  }

  async listarVigentes() {
    const result = await this.pool.query(
      'SELECT huella_token FROM token_revocado WHERE expira_en > NOW();'
    );
    return result.rows.map((r) => r.huella_token);
  }

  async eliminarExpirados() {
    await this.pool.query('DELETE FROM token_revocado WHERE expira_en <= NOW();');
  }
}

module.exports = PostgresTokenRevocadoRepository;
