const ReservaRepositoryPort = require('../../../application/ports/ReservaRepositoryPort');
const Reserva = require('../../../domain/entities/Reserva');

const COLUMNAS = `
  id_reserva,
  id_padre,
  id_ninera,
  id_hijo,
  TO_CHAR(fecha_reserva, 'YYYY-MM-DD') AS fecha_reserva,
  TO_CHAR(hora_inicio, 'HH24:MI') AS hora_inicio,
  TO_CHAR(hora_fin, 'HH24:MI') AS hora_fin,
  direccion,
  estado_reserva,
  comentario,
  tarifa_hora,
  horas,
  monto_total,
  fecha_pago,
  comision_plataforma,
  fecha_creacion,
  expira_en,
  grupo_reserva
`;

// Activa = no cancelada/rechazada y, si está pendiente, todavía dentro de sus 10 min para pagar.
const FILTRO_ACTIVA = `LOWER(COALESCE(estado_reserva, 'pendiente')) NOT IN ('cancelada', 'rechazada')
  AND NOT (
    LOWER(COALESCE(estado_reserva, 'pendiente')) = 'pendiente'
    AND expira_en IS NOT NULL
    AND expira_en <= NOW()
  )`;

/**
 * Adaptador Secundario (DAO PostgreSQL): PostgresReservaRepository
 */
class PostgresReservaRepository extends ReservaRepositoryPort {
  constructor(pool) {
    super();
    if (!pool) throw new Error('pool de PostgreSQL es requerido en PostgresReservaRepository');
    this.pool = pool;
  }

  async crearRango(reservas, grupo) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const primera = reservas[0];
      await client.query('SELECT pg_advisory_xact_lock(101, $1::int)', [primera.idNinera]);
      if (primera.idHijo) await client.query('SELECT pg_advisory_xact_lock(102, $1::int)', [primera.idHijo]);
      const guardadas = [];
      for (const r of reservas) {
        const result = await client.query(`INSERT INTO reserva
          (id_padre,id_ninera,id_hijo,fecha_reserva,hora_inicio,hora_fin,direccion,estado_reserva,comentario,tarifa_hora,horas,monto_total,expira_en,grupo_reserva)
          SELECT $1,$2,$3,$4::date,$5::time,$6::time,$7,'Pendiente',$8,$9,$10,$11,$12::timestamptz,$13::uuid
          WHERE NOT EXISTS (SELECT 1 FROM reserva WHERE (id_ninera=$2 OR ($3::integer IS NOT NULL AND id_hijo=$3::integer))
            AND fecha_reserva=$4::date AND ${FILTRO_ACTIVA} AND hora_inicio<$6::time AND $5::time<hora_fin)
          RETURNING ${COLUMNAS}`, [r.idPadre,r.idNinera,r.idHijo,r.fechaReserva,r.horaInicio,r.horaFin,r.direccion,r.comentario,r.tarifaHora,r.horas,r.montoTotal,r.expiraEn,grupo]);
        if (!result.rows.length) { await client.query('ROLLBACK'); return null; }
        guardadas.push(filaAReserva(result.rows[0]));
      }
      await client.query('COMMIT');
      return guardadas;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async listarGrupo(grupo, idPadre) {
    const r = await this.pool.query(`SELECT ${COLUMNAS} FROM reserva WHERE grupo_reserva=$1::uuid AND id_padre=$2 ORDER BY fecha_reserva`, [grupo, idPadre]);
    return r.rows.map(filaAReserva);
  }

  async cancelarFechas(grupo, idPadre, fechas) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const rows = await client.query(`SELECT ${COLUMNAS} FROM reserva WHERE grupo_reserva=$1::uuid AND id_padre=$2 AND fecha_reserva=ANY($3::date[]) ORDER BY id_reserva FOR UPDATE`, [grupo,idPadre,fechas]);
      if (rows.rows.length !== fechas.length || rows.rows.some((r) => !['pendiente','pagada','aceptada'].includes(String(r.estado_reserva).toLowerCase()) || (r.expira_en && String(r.estado_reserva).toLowerCase() === 'pendiente' && new Date(r.expira_en) <= new Date()))) { await client.query('ROLLBACK'); return null; }
      if (rows.rows.some((r) => !filaAReserva(r).puedeCancelarse())) { await client.query('ROLLBACK'); return null; }
      const result = await client.query(`UPDATE reserva SET estado_reserva='Cancelada' WHERE grupo_reserva=$1::uuid AND id_padre=$2 AND fecha_reserva=ANY($3::date[]) RETURNING ${COLUMNAS}`, [grupo,idPadre,fechas]);
      await client.query('COMMIT'); return result.rows.map(filaAReserva);
    } catch(error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async crearDesdePostulacion(reserva, idOferta, idPostulacion) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(101, $1::int)', [reserva.idNinera]);
      const oferta = await client.query(`SELECT id_oferta FROM oferta_trabajo
        WHERE id_oferta = $1 AND id_padre = $2 AND estado = 'ABIERTA'
          AND fecha_inicio=$3::date AND hora_inicio=$4::time AND hora_fin=$5::time AND tarifa_hora=$6::numeric
        FOR UPDATE`, [idOferta, reserva.idPadre, reserva.fechaReserva, reserva.horaInicio, reserva.horaFin, reserva.tarifaHora]);
      if (!oferta.rows.length) { await client.query('ROLLBACK'); return null; }
      const result = await client.query(`INSERT INTO reserva
        (id_padre,id_ninera,id_hijo,fecha_reserva,hora_inicio,hora_fin,direccion,estado_reserva,comentario,tarifa_hora,horas,monto_total,expira_en,id_postulacion)
        SELECT $1,$2,NULL,$3::date,$4::time,$5::time,$6,'Pendiente',$7,$8,$9,$10,$11::timestamptz,$12
        WHERE EXISTS (SELECT 1 FROM postulacion WHERE id_postulacion=$12 AND id_oferta=$13 AND id_ninera=$2 AND estado='PENDIENTE')
        AND NOT EXISTS (SELECT 1 FROM reserva r JOIN postulacion p ON p.id_postulacion=r.id_postulacion
          WHERE p.id_oferta=$13 AND LOWER(r.estado_reserva) NOT IN ('cancelada','rechazada')
          AND NOT (LOWER(r.estado_reserva)='pendiente' AND r.expira_en <= NOW()))
        AND NOT EXISTS (SELECT 1 FROM reserva WHERE id_ninera=$2 AND fecha_reserva=$3::date
          AND ${FILTRO_ACTIVA} AND hora_inicio<$5::time AND $4::time<hora_fin)
        RETURNING ${COLUMNAS}`,
      [reserva.idPadre,reserva.idNinera,reserva.fechaReserva,reserva.horaInicio,reserva.horaFin,
        reserva.direccion,reserva.comentario,reserva.tarifaHora,reserva.horas,reserva.montoTotal,reserva.expiraEn,idPostulacion,idOferta]);
      await client.query('COMMIT');
      return result.rows[0] ? filaAReserva(result.rows[0]) : null;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async listarActivasDeNineraEnFecha(idNinera, fecha) {
    const result = await this.pool.query(
      `SELECT ${COLUMNAS} FROM reserva
       WHERE id_ninera = $1 AND fecha_reserva = $2::date AND ${FILTRO_ACTIVA}
       ORDER BY hora_inicio ASC;`,
      [idNinera, fecha],
    );
    return result.rows.map(filaAReserva);
  }

  async listarActivasDeHijoEnFecha(idHijo, fecha) {
    const result = await this.pool.query(
      `SELECT ${COLUMNAS} FROM reserva
       WHERE id_hijo = $1 AND fecha_reserva = $2::date AND ${FILTRO_ACTIVA}
       ORDER BY hora_inicio ASC;`,
      [idHijo, fecha],
    );
    return result.rows.map(filaAReserva);
  }

  /**
   * INSERT ... SELECT ... WHERE NOT EXISTS: el chequeo y el guardado van en
   * UNA sola sentencia. Si entre la validación del servicio y este INSERT otra
   * familia tomó el horario, no se inserta nada y se devuelve null.
   */
  async crearSiNoHaySolapamiento(reserva) {
    const client = await this.pool.connect();
    try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(101, $1::int)', [reserva.idNinera]);
    if (reserva.idHijo) await client.query('SELECT pg_advisory_xact_lock(102, $1::int)', [reserva.idHijo]);
    const result = await client.query(
      `INSERT INTO reserva (
         id_padre, id_ninera, id_hijo, fecha_reserva, hora_inicio, hora_fin,
         direccion, estado_reserva, comentario, tarifa_hora, horas, monto_total, expira_en
       )
       SELECT $1, $2, $3, $4::date, $5::time, $6::time, $7, 'Pendiente', $8, $9, $10, $11, $12::timestamptz
       WHERE NOT EXISTS (
         SELECT 1 FROM reserva
         WHERE (
             id_ninera = $2
             OR ($3::integer IS NOT NULL AND id_hijo = $3::integer)
           )
           AND fecha_reserva = $4::date
           AND ${FILTRO_ACTIVA}
           AND hora_inicio < $6::time
           AND $5::time < hora_fin
       )
       RETURNING ${COLUMNAS};`,
      [
        reserva.idPadre,
        reserva.idNinera,
        reserva.idHijo,
        reserva.fechaReserva,
        reserva.horaInicio,
        reserva.horaFin,
        reserva.direccion,
        reserva.comentario,
        reserva.tarifaHora,
        reserva.horas,
        reserva.montoTotal,
        reserva.expiraEn,
      ],
    );
    await client.query('COMMIT');
    if (result.rows.length === 0) return null;
    return filaAReserva(result.rows[0]);
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  async listarPorPadre(idPadre) {
    const result = await this.pool.query(
      `SELECT ${COLUMNAS} FROM reserva
       WHERE id_padre = $1
       ORDER BY fecha_reserva DESC, hora_inicio DESC;`,
      [idPadre],
    );
    return result.rows.map(filaAReserva);
  }

  async listarPorNinera(idNinera) {
    const result = await this.pool.query(
      `SELECT ${COLUMNAS} FROM reserva
       WHERE id_ninera = $1
       ORDER BY fecha_reserva DESC, hora_inicio DESC;`,
      [idNinera],
    );
    return result.rows.map(filaAReserva);
  }

  async buscarPorId(idReserva) {
    const result = await this.pool.query(
      `SELECT ${COLUMNAS} FROM reserva WHERE id_reserva = $1;`,
      [idReserva],
    );
    return result.rows[0] ? filaAReserva(result.rows[0]) : null;
  }

  async actualizarEstado(idReserva, estadoReserva, estadosEsperados, montoEsperado) {
    if (String(estadoReserva).toLowerCase() === 'pagada') {
      return this.confirmarPago(idReserva, estadosEsperados, montoEsperado);
    }
    const result = await this.pool.query(
      `UPDATE reserva SET estado_reserva = $2::varchar,
              expira_en = CASE WHEN LOWER($2::varchar) IN ('aceptada', 'confirmada', 'completada') THEN NULL ELSE expira_en END
       WHERE id_reserva = $1
         AND LOWER(COALESCE(estado_reserva, 'pendiente')) = ANY($3::text[])
       RETURNING ${COLUMNAS};`,
      [idReserva, estadoReserva, estadosEsperados.map((estado) => String(estado).toLowerCase())],
    );
    return result.rows[0] ? filaAReserva(result.rows[0]) : null;
  }

  async confirmarPago(idReserva, estadosEsperados, montoEsperado) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const grupo = await client.query('SELECT grupo_reserva FROM reserva WHERE id_reserva=$1', [idReserva]);
      if (grupo.rows[0]?.grupo_reserva) {
        const grupoId = grupo.rows[0].grupo_reserva;
        const bloqueadas = await client.query(`SELECT ${COLUMNAS} FROM reserva WHERE grupo_reserva=$1::uuid AND LOWER(estado_reserva)='pendiente' ORDER BY id_reserva FOR UPDATE`, [grupoId]);
        const total = Math.round(bloqueadas.rows.reduce((s, r) => s + Number(r.monto_total), 0) * 100) / 100;
        if (!bloqueadas.rows.some((r) => Number(r.id_reserva) === Number(idReserva)) || bloqueadas.rows.some((r) => r.expira_en && new Date(r.expira_en) <= new Date()) || total !== Number(montoEsperado)) { await client.query('ROLLBACK'); return null; }
        const result = await client.query(`UPDATE reserva SET estado_reserva='Pagada' WHERE grupo_reserva=$1::uuid AND LOWER(estado_reserva)='pendiente' RETURNING ${COLUMNAS}`, [grupoId]);
        // Distribuir el redondeo del 5% por reserva sin perder céntimos en pagos agrupados.
        let acumuladoCentimos = 0;
        for (const fila of bloqueadas.rows) {
          const anterior = Math.round(acumuladoCentimos * 0.05);
          acumuladoCentimos += Math.round(Number(fila.monto_total) * 100);
          const comision = (Math.round(acumuladoCentimos * 0.05) - anterior) / 100;
          await client.query('UPDATE reserva SET fecha_pago=NOW(), comision_plataforma=$2 WHERE id_reserva=$1', [fila.id_reserva, comision]);
        }
        await client.query('COMMIT');
        return filaAReserva(result.rows.find((r) => Number(r.id_reserva) === Number(idReserva)));
      }
      const vinculada = await client.query(`SELECT p.id_oferta, p.id_postulacion FROM reserva r
        JOIN postulacion p ON p.id_postulacion=r.id_postulacion WHERE r.id_reserva=$1`, [idReserva]);
      if (vinculada.rows.length) {
        const { id_oferta, id_postulacion } = vinculada.rows[0];
        const oferta = await client.query(`SELECT id_oferta FROM oferta_trabajo WHERE id_oferta=$1 AND estado='ABIERTA' FOR UPDATE`, [id_oferta]);
        if (!oferta.rows.length) { await client.query('ROLLBACK'); return null; }
        const result = await client.query(`UPDATE reserva SET estado_reserva='Pagada', fecha_pago=NOW(), comision_plataforma=ROUND(monto_total * 0.05, 2)
          WHERE id_reserva=$1 AND LOWER(estado_reserva)=ANY($2::text[]) AND (expira_en IS NULL OR expira_en > NOW()) RETURNING ${COLUMNAS}`,
          [idReserva, estadosEsperados.map((e) => String(e).toLowerCase())]);
        if (!result.rows.length) { await client.query('ROLLBACK'); return null; }
        await client.query(`UPDATE postulacion SET estado=CASE WHEN id_postulacion=$2 THEN 'ACEPTADA' ELSE 'RECHAZADA' END WHERE id_oferta=$1 AND estado='PENDIENTE'`, [id_oferta,id_postulacion]);
        await client.query(`UPDATE oferta_trabajo SET estado='CERRADA' WHERE id_oferta=$1`, [id_oferta]);
        await client.query('COMMIT');
        return filaAReserva(result.rows[0]);
      }
      const result = await client.query(`UPDATE reserva SET estado_reserva='Pagada', fecha_pago=NOW(), comision_plataforma=ROUND(monto_total * 0.05, 2)
        WHERE id_reserva=$1 AND LOWER(COALESCE(estado_reserva,'pendiente'))=ANY($2::text[])
        AND (expira_en IS NULL OR expira_en > NOW()) RETURNING ${COLUMNAS}`,
      [idReserva, estadosEsperados.map((e) => String(e).toLowerCase())]);
      await client.query('COMMIT');
      return result.rows[0] ? filaAReserva(result.rows[0]) : null;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
}

function filaAReserva(row) {
  return new Reserva({
    id: row.id_reserva,
    idPadre: row.id_padre,
    idNinera: row.id_ninera,
    idHijo: row.id_hijo,
    fechaReserva: row.fecha_reserva,
    horaInicio: row.hora_inicio,
    horaFin: row.hora_fin,
    direccion: row.direccion,
    estadoReserva: row.estado_reserva,
    comentario: row.comentario,
    tarifaHora: row.tarifa_hora !== null ? Number(row.tarifa_hora) : null,
    horas: row.horas !== null ? Number(row.horas) : null,
    montoTotal: row.monto_total !== null ? Number(row.monto_total) : null,
    fechaCreacion: row.fecha_creacion,
    fechaPago: row.fecha_pago,
    comisionPlataforma: row.comision_plataforma == null ? null : Number(row.comision_plataforma),
    expiraEn: row.expira_en,
    grupoReserva: row.grupo_reserva,
  });
}

module.exports = PostgresReservaRepository;
