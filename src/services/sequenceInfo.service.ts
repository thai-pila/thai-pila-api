import pool from './db'
import { v4 as uuidv4 } from 'uuid';

export interface CreateSequencePayload {
    teacher_uuid?: string | null;
    create_by?: string | null;
    exercise_name?: string;
    description?: string | null;
    subject?: string;
    thumbnail?: string | null;
    group_id?: number | null;
    sequence_default?: boolean;
    class?: string | null;
}

export interface SequenceGameEntry {
  sequenceId: number;
  gameId: number;
}

export interface SequenceGameUuidEntry {
  sequenceId: number;
  gameUuid: string;
}

function withUploadPrefix(value: string | null | undefined): string | null | undefined {
    if (!value) return value;
    if (value.startsWith('/upload/')) return value;
    return `/upload/${value}`;
}

export async function createSequence(payload: CreateSequencePayload) {

    const uuid = uuidv4();
    const text = `
    INSERT INTO sequence_info (uuid, teacher_uuid, create_by, exercise_name, description, subject, class, thumbnail, group_id, sequence_default)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, thumbnail, group_id, sequence_default, create_at
    `;
    const values = [
        uuid,
        payload.teacher_uuid ?? null,
        payload.create_by ?? null,
        payload.exercise_name ?? null,
        payload.description ?? null,
        payload.subject ?? null,
        payload.class ?? null,
        withUploadPrefix(payload.thumbnail ?? null),
        payload.group_id ?? null,
        payload.sequence_default ?? false,
    ];

    const res = await pool.query(text, values);
    return res.rows[0];
}

export async function findSequenceById(id: number) {
  const res = await pool.query('SELECT id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, thumbnail, group_id, sequence_default, status, create_at FROM sequence_info WHERE id = $1', [id]);
    return res.rows[0] ?? null;
}

export async function findAllSequences() {
  const res = await pool.query('SELECT id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, thumbnail, group_id, sequence_default, status, create_at FROM sequence_info');
    return res.rows;
}

export async function findSequenceByUuidWithGames(uuid: string) {
  const sequenceText = `
    SELECT id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, thumbnail, group_id, sequence_default, status, create_at
    FROM sequence_info
    WHERE uuid = $1
    LIMIT 1
  `;
  const sequenceRes = await pool.query(sequenceText, [uuid]);
  const sequence = sequenceRes.rows[0] ?? null;

  if (!sequence) return null;

  const gamesText = `
    SELECT gi.id, gi.uuid, gi.teacher_uuid, gi.create_by, gi.exercise_name, gi.description, gi.subject, gi.class, gi.question_type, gi.game_type, gi.thumbnail, gi.question_category_id, gi.group_id, gi.create_at, gi.delete_at
    FROM game_info gi
    JOIN sequence_game sg ON gi.id = sg.id_game_info
    WHERE sg.id_sequence_info = $1
    ORDER BY gi.id ASC
  `;
  const gamesRes = await pool.query(gamesText, [sequence.id]);

  return {
    sequence,
    games: gamesRes.rows,
  };
}

export async function findSequenceByUuidWithGameDetails(uuid: string) {
  const sequenceText = `
    SELECT id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, thumbnail, group_id, sequence_default, status, create_at
    FROM sequence_info
    WHERE uuid = $1
    LIMIT 1
  `;

  const sequenceRes = await pool.query(sequenceText, [uuid]);
  const sequence = sequenceRes.rows[0] ?? null;
  if (!sequence) return null;

  const gameRes = await pool.query(
    `
    SELECT gi.id
    FROM game_info gi
    JOIN sequence_game sg ON gi.id = sg.id_game_info
    WHERE sg.id_sequence_info = $1
    ORDER BY gi.id ASC
    `,
    [sequence.id]
  );

  const games: any[] = [];

  for (const row of gameRes.rows) {
    const gameId = Number(row.id);
    const gameInfoRes = await pool.query(
      `
      SELECT id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, question_type, game_type, thumbnail, question_category_id, group_id, other_image, suggestion, status, create_at, delete_at
      FROM game_info
      WHERE id = $1
      LIMIT 1
      `,
      [gameId]
    );

    if (gameInfoRes.rowCount === 0) continue;

    const gameInfo = gameInfoRes.rows[0];
    gameInfo.thumbnail = withUploadPrefix(gameInfo.thumbnail);
    gameInfo.other_image = withUploadPrefix(gameInfo.other_image);

    const isSituationGame = gameInfo.game_type === 'situation';
    const questionTable = isSituationGame ? 'situation_question_multiple' : 'question_multiple';
    const choiceTable = isSituationGame ? 'situation_choice_multiple' : 'choice_multiple';
    const questionSelect = isSituationGame
      ? 'id, id_game_info, no, question, question_position, hint, sound_question, image_question, sound_hint, image_hint, create_at'
      : 'id, id_game_info, no, question, hint, sound_question, image_question, sound_hint, image_hint, create_at';

    const questionsRes = await pool.query(
      `
      SELECT ${questionSelect}
      FROM ${questionTable}
      WHERE id_game_info = $1 AND delete_at IS NULL
      ORDER BY no ASC
      `,
      [gameId]
    );

    const questions = questionsRes.rows;

    for (const question of questions) {
      const choicesRes = await pool.query(
        `
        SELECT id, id_question_multiple, choice, is_correct, sound_choice, image_choice, create_at
        FROM ${choiceTable}
        WHERE id_question_multiple = $1 AND delete_at IS NULL
        ORDER BY id ASC
        `,
        [question.id]
      );

      question.choices = choicesRes.rows;
    }

    games.push({
      game_info: gameInfo,
      questions,
    });
  }

  return {
    sequence,
    games,
  };
}

export async function addGamesToSequence(entries: SequenceGameEntry[]) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('entries must be a non-empty array');
  }

  const values: any[] = [];
  const placeholders: string[] = [];
  let idx = 1;

  for (const e of entries) {
    const seq = Number(e.sequenceId);
    const gid = Number(e.gameId);
    if (!Number.isFinite(seq) || !Number.isFinite(gid)) {
      throw new Error('sequenceId and gameId must be numbers');
    }
    values.push(seq, gid);
    placeholders.push(`($${idx}, $${idx + 1})`);
    idx += 2;
  }

  const text = `INSERT INTO sequence_game (id_sequence_info, id_game_info) VALUES ${placeholders.join(', ')} RETURNING id, id_sequence_info, id_game_info`;

  const res = await pool.query(text, values);
  return res.rows;
}

export async function addGamesToSequenceByGameUuid(entries: SequenceGameUuidEntry[]) {
  if (!Array.isArray(entries) || entries.length === 0) {
    const err: any = new Error('entries must be a non-empty array');
    err.code = 'SEQ_GAME_UUID_ENTRIES_INVALID';
    throw err;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const insertedRows: any[] = [];

    for (const entry of entries) {
      const sequenceId = Number(entry.sequenceId);
      const gameUuid = String(entry.gameUuid ?? '').trim();

      if (!Number.isFinite(sequenceId) || !gameUuid) {
        const err: any = new Error('sequenceId and gameUuid are required');
        err.code = 'SEQ_GAME_UUID_ENTRY_INVALID';
        throw err;
      }

      const sequenceRes = await client.query(
        `
        SELECT id
        FROM sequence_info
        WHERE id = $1 AND delete_at IS NULL
        LIMIT 1
        `,
        [sequenceId]
      );

      if (sequenceRes.rowCount === 0) {
        const err: any = new Error('sequence not found');
        err.code = 'SEQ_NOT_FOUND';
        throw err;
      }

      const gameRes = await client.query(
        `
        SELECT id
        FROM game_info
        WHERE uuid = $1 AND delete_at IS NULL
        LIMIT 1
        `,
        [gameUuid]
      );

      if (gameRes.rowCount === 0) {
        const err: any = new Error('game uuid not found');
        err.code = 'GAME_UUID_NOT_FOUND';
        throw err;
      }

      const gameId = Number(gameRes.rows[0].id);
      const inserted = await client.query(
        `
        INSERT INTO sequence_game (id_sequence_info, id_game_info)
        VALUES ($1, $2)
        RETURNING id, id_sequence_info, id_game_info
        `,
        [sequenceId, gameId]
      );

      insertedRows.push({
        ...inserted.rows[0],
        game_uuid: gameUuid,
      });
    }

    await client.query('COMMIT');
    return insertedRows;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function hardDeleteGamesFromSequence(sequenceId: number, gameIds: number[]) {
  if (!Number.isFinite(sequenceId)) {
    throw new Error('sequenceId must be a number');
  }

  if (!Array.isArray(gameIds) || gameIds.length === 0) {
    throw new Error('gameIds must be a non-empty array');
  }

  const normalizedGameIds = gameIds.map((value) => Number(value));
  if (normalizedGameIds.some((value) => !Number.isFinite(value))) {
    throw new Error('all gameIds must be numbers');
  }

  const text = `
    DELETE FROM sequence_game
    WHERE id_sequence_info = $1
      AND id_game_info = ANY($2::int[])
    RETURNING id, id_sequence_info, id_game_info
  `;

  const res = await pool.query(text, [sequenceId, normalizedGameIds]);
  return res.rows;
}

export async function findSequencesByGameId(gameId: number) {
    const text = `
  SELECT si.id, si.uuid, si.teacher_uuid, si.create_by, si.exercise_name, si.description, si.subject, si.class, si.thumbnail, si.group_id, si.sequence_default, si.status, si.create_at
        FROM sequence_info si
        JOIN sequence_game sg ON si.id = sg.id_sequence_info
        WHERE sg.id_game_info = $1
    `;
    const res = await pool.query(text, [gameId]);
    return res.rows;
}

export async function softDeleteSequenceById(id: number) {
    const text = `
        UPDATE sequence_info
        SET delete_at = CURRENT_TIMESTAMP
        WHERE id = $1
  RETURNING id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, thumbnail, group_id, sequence_default, status, create_at, delete_at
    `;
    const res = await pool.query(text, [id]);
    return res.rows[0] ?? null;
}

export interface UpdateSequenceInfoPayload {
    exercise_name?: string;
  sequence_default?: boolean;
}

export async function updateExerciseNameById(id: number, payload: UpdateSequenceInfoPayload) {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (Object.prototype.hasOwnProperty.call(payload, "exercise_name")) {
        updates.push(`exercise_name = $${idx++}`);
        values.push(payload.exercise_name);
    }

    if (Object.prototype.hasOwnProperty.call(payload, "sequence_default")) {
      updates.push(`sequence_default = $${idx++}`);
      values.push(payload.sequence_default);
    }

    if (updates.length === 0) {
        throw new Error("no updatable fields provided");
    }

    const text = `
        UPDATE sequence_info
        SET ${updates.join(", ")}, update_at = CURRENT_TIMESTAMP
        WHERE id = $${idx}
      RETURNING id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, thumbnail, group_id, sequence_default, status, create_at, update_at
    `;

    values.push(id);

    const res = await pool.query(text, values);
    return res.rows[0];
}

export async function updateSequenceStatusById(id: number, status: boolean) {
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error('invalid id');
    }

    const text = `
        UPDATE sequence_info
        SET status = $1, update_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, uuid, teacher_uuid, exercise_name, status, update_at
    `;

    const res = await pool.query(text, [status, id]);
    if (res.rowCount === 0) {
        throw new Error('not found');
    }

    return res.rows[0];
}

export async function hardDeleteSequenceById(id: number) {
    const text = `
        DELETE FROM sequence_info
        WHERE id = $1
        RETURNING id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, thumbnail, group_id, sequence_default, status, create_at, delete_at
    `;
    const res = await pool.query(text, [id]);
    return res.rows[0] ?? null;
}