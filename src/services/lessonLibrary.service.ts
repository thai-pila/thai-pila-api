import pool from "./db";

export interface LibraryNote {
  id: number;
  name: string;
  detail: string | null;
  create_at: string | null;
  update_at: string | null;
}

export interface LibraryItem {
  unique_id: string;
  id: number;
  uuid: string | null;
  teacher_uuid?: string | null;
  teacher_name?: string | null;
  create_by?: string | null;
  exercise_name: string | null;
  description?: string | null;
  subject: string | null;
  class?: string | null;
  question_type: string | null;
  game_type: string | null;
  thumbnail: string | null;
  status?: boolean;
  create_at: string | null;
  update_at?: string | null;
  delete_at: string | null;
  ban_at?: string | null;
  source: "game" | "sequence";
  group_id: number | null;
  group_name: string | null;
  game_default?: boolean;
  sequence_default?: boolean;
  notes: LibraryNote[];
}

export interface LibraryItemByUuidResult {
  source: "game" | "sequence";
  game_info?: {
    id: number;
    uuid: string | null;
    teacher_uuid: string | null;
    teacher_name: string | null;
    create_by: string | null;
    exercise_name: string | null;
    description: string | null;
    subject: string | null;
    class: string | null;
    question_type: string | null;
    game_type: string | null;
    thumbnail: string | null;
    status: boolean | null;
    question_category_id: number | null;
    other_image: string | null;
    suggestion: string | null;
    group_id: number | null;
    create_at: string | null;
    update_at: string | null;
    delete_at: string | null;
    ban_at?: string | null;
    notes: LibraryNote[];
  };
  sequence_info?: {
    id: number;
    uuid: string | null;
    teacher_uuid: string | null;
    teacher_name: string | null;
    create_by: string | null;
    exercise_name: string | null;
    description: string | null;
    subject: string | null;
    class: string | null;
    thumbnail: string | null;
    status: boolean | null;
    group_id: number | null;
    create_at: string | null;
    update_at: string | null;
    delete_at: string | null;
    notes: LibraryNote[];
  };
}

function normalizeNotes(raw: unknown): LibraryNote[] {
  if (!Array.isArray(raw)) return [];

  return raw.map((item: any) => ({
    id: Number(item?.id ?? 0),
    name: String(item?.name ?? ""),
    detail: item?.detail ?? null,
    create_at: item?.create_at ?? null,
    update_at: item?.update_at ?? null,
  }));
}

export async function getCombinedLibrary(): Promise<LibraryItem[]> {
  const text = `
    (SELECT
       g.id,
       g.uuid,
       g.teacher_uuid,
       tg.name AS teacher_name,
       g.create_by,
       g.exercise_name,
       g.subject,
      g.class,
       g.question_type,
       g.game_type,
       g.thumbnail,
      g.status,
       to_char(g.create_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS create_at,
       to_char(g.update_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS update_at,
       to_char(g.delete_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS delete_at,
      to_char(g.ban_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS ban_at,
       'game' AS source,
       g.group_id,
       gr.name AS group_name,
       gn.notes AS notes
     FROM game_info g
    LEFT JOIN teacher tg ON tg.uuid = g.teacher_uuid AND tg.delete_at IS NULL
    LEFT JOIN "group" gr ON g.group_id = gr.id
    LEFT JOIN LATERAL (
      SELECT COALESCE(
        json_agg(
          json_build_object(
            'id', n.id,
            'name', n.name,
            'detail', n.detail,
            'create_at', to_char(n.create_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
            'update_at', to_char(n.update_at, 'YYYY-MM-DD"T"HH24:MI:SS')
          )
          ORDER BY n.id DESC
        ),
        '[]'::json
      ) AS notes
      FROM note n
      WHERE n.id_gameinfo = g.id AND n.delete_at IS NULL
    ) gn ON TRUE
    WHERE g.delete_at IS NULL)
    UNION ALL
    (SELECT
       s.id,
       s.uuid,
       s.teacher_uuid,
       ts.name AS teacher_name,
       s.create_by,
       s.exercise_name,
       s.subject,
      s.class AS class,
       NULL::varchar AS question_type,
       NULL::varchar AS game_type,
       s.thumbnail,
      s.status,
       to_char(s.create_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS create_at,
       to_char(s.update_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS update_at,
       to_char(s.delete_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS delete_at,
      NULL::text AS ban_at,
       'sequence' AS source,
       s.group_id,
       gr.name AS group_name,
       sn.notes AS notes
     FROM sequence_info s
    LEFT JOIN teacher ts ON ts.uuid = s.teacher_uuid AND ts.delete_at IS NULL
     LEFT JOIN "group" gr ON s.group_id = gr.id
     LEFT JOIN LATERAL (
       SELECT COALESCE(
         json_agg(
           json_build_object(
             'id', n.id,
             'name', n.name,
             'detail', n.detail,
             'create_at', to_char(n.create_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
             'update_at', to_char(n.update_at, 'YYYY-MM-DD"T"HH24:MI:SS')
           )
           ORDER BY n.id DESC
         ),
         '[]'::json
       ) AS notes
       FROM note n
       WHERE n.id_sequenceinfo = s.id AND n.delete_at IS NULL
     ) sn ON TRUE
     WHERE s.delete_at IS NULL)
    ORDER BY create_at DESC NULLS LAST
  `;

  const res = await pool.query(text);

  return res.rows.map((r: any) => ({
    unique_id: `${r.source}_${r.id}`, // ID ใหม่จากการรวม source และ id
    id: r.id,
    uuid: r.uuid ?? null,
    teacher_uuid: r.teacher_uuid ?? null,
    teacher_name: r.teacher_name ?? null,
    create_by: r.create_by ?? null,
    exercise_name: r.exercise_name ?? null,
    subject: r.subject ?? null,
    class: r.class ?? null,
    question_type: r.question_type ?? null,
    game_type: r.game_type ?? null,
    thumbnail: r.thumbnail ?? null,
    status: r.status ?? false,
    create_at: r.create_at ?? null,
    update_at: r.update_at ?? null,
    delete_at: r.delete_at ?? null,
    ban_at: r.ban_at ?? null,
    source: r.source as "game" | "sequence",
    group_id: r.group_id ?? null,
    group_name: r.group_name ?? null,
    notes: normalizeNotes(r.notes),
  }));
}

export async function getCombinedLibraryByTeacherUuid(teacher_uuid: string): Promise<LibraryItem[]> {
  const text = `
    (SELECT
       g.id,
       g.uuid,
       g.teacher_uuid,
      tg.name AS teacher_name,
       g.create_by,
       g.exercise_name,
       g.description, 
       g.subject,
      g.class,
       g.question_type,
       g.game_type,
       g.thumbnail,
      g.status,
       to_char(g.create_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS create_at,
       to_char(g.update_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS update_at,
       to_char(g.delete_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS delete_at,
      to_char(g.ban_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS ban_at,
       'game' AS source,
       g.group_id,
       gr.name AS group_name,
       g.game_default,
       false AS sequence_default,
       gn.notes AS notes
     FROM game_info g
    LEFT JOIN teacher tg ON tg.uuid = g.teacher_uuid AND tg.delete_at IS NULL
     LEFT JOIN "group" gr ON g.group_id = gr.id
     LEFT JOIN LATERAL (
       SELECT COALESCE(
         json_agg(
           json_build_object(
             'id', n.id,
             'name', n.name,
             'detail', n.detail,
             'create_at', to_char(n.create_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
             'update_at', to_char(n.update_at, 'YYYY-MM-DD"T"HH24:MI:SS')
           )
           ORDER BY n.id DESC
         ),
         '[]'::json
       ) AS notes
       FROM note n
       WHERE n.id_gameinfo = g.id AND n.delete_at IS NULL
     ) gn ON TRUE
     WHERE g.delete_at IS NULL 
       AND (g.teacher_uuid = $1 OR g.game_default = true))
    UNION ALL
    (SELECT
       s.id,
       s.uuid,
       s.teacher_uuid,
      ts.name AS teacher_name,
       s.create_by,
       s.exercise_name,
       s.description,
       s.subject,
      s.class AS class,
       NULL::varchar AS question_type,
       NULL::varchar AS game_type,
       s.thumbnail,
      s.status,
       to_char(s.create_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS create_at,
       to_char(s.update_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS update_at,
       to_char(s.delete_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS delete_at,
      NULL::text AS ban_at,
       'sequence' AS source,
       s.group_id,
       gr.name AS group_name,
       false AS game_default,
       s.sequence_default,
       sn.notes AS notes
     FROM sequence_info s
    LEFT JOIN teacher ts ON ts.uuid = s.teacher_uuid AND ts.delete_at IS NULL
     LEFT JOIN "group" gr ON s.group_id = gr.id
     LEFT JOIN LATERAL (
       SELECT COALESCE(
         json_agg(
           json_build_object(
             'id', n.id,
             'name', n.name,
             'detail', n.detail,
             'create_at', to_char(n.create_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
             'update_at', to_char(n.update_at, 'YYYY-MM-DD"T"HH24:MI:SS')
           )
           ORDER BY n.id DESC
         ),
         '[]'::json
       ) AS notes
       FROM note n
       WHERE n.id_sequenceinfo = s.id AND n.delete_at IS NULL
     ) sn ON TRUE
     WHERE s.delete_at IS NULL 
       AND (s.teacher_uuid = $1 OR (s.sequence_default = true AND s.status = true)))
    ORDER BY create_at DESC NULLS LAST
  `;

  const values = [teacher_uuid];
  const res = await pool.query(text, values);

  return res.rows.map((r: any) => ({
    unique_id: `${r.source}_${r.id}`,
    id: r.id,
    uuid: r.uuid ?? null,
    teacher_uuid: r.teacher_uuid ?? null,
    teacher_name: r.teacher_name ?? null,
    create_by: r.create_by ?? null,
    exercise_name: r.exercise_name ?? null,
    description: r.description ?? null,
    subject: r.subject ?? null,
    class: r.class ?? null,
    question_type: r.question_type ?? null,
    game_type: r.game_type ?? null,
    thumbnail: r.thumbnail ?? null,
    status: r.status ?? false,
    create_at: r.create_at ?? null,
    update_at: r.update_at ?? null,
    delete_at: r.delete_at ?? null,
    ban_at: r.ban_at ?? null,
    source: r.source as "game" | "sequence",
    group_id: r.group_id ?? null,
    group_name: r.group_name ?? null,
    game_default: r.game_default ?? false,
    sequence_default: r.sequence_default ?? false,
    notes: normalizeNotes(r.notes),
  }));
}

export async function getDefaultGameLibrary(): Promise<LibraryItem[]> {
  const text = `
    (SELECT
       g.id,
       g.uuid,
       g.teacher_uuid,
      tg.name AS teacher_name,
       g.create_by,
       g.exercise_name,
       g.description,
       g.subject,
      g.class,
       g.question_type,
       g.game_type,
       g.thumbnail,
      g.status,
       to_char(g.create_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS create_at,
       to_char(g.update_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS update_at,
       to_char(g.delete_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS delete_at,
      to_char(g.ban_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS ban_at,
       'game' AS source,
       g.group_id,
       gr.name AS group_name,
       g.game_default,
       false AS sequence_default,
       gn.notes AS notes
     FROM game_info g
    LEFT JOIN teacher tg ON tg.uuid = g.teacher_uuid AND tg.delete_at IS NULL
     LEFT JOIN "group" gr ON g.group_id = gr.id
     LEFT JOIN LATERAL (
       SELECT COALESCE(
         json_agg(
           json_build_object(
             'id', n.id,
             'name', n.name,
             'detail', n.detail,
             'create_at', to_char(n.create_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
             'update_at', to_char(n.update_at, 'YYYY-MM-DD"T"HH24:MI:SS')
           )
           ORDER BY n.id DESC
         ),
         '[]'::json
       ) AS notes
       FROM note n
       WHERE n.id_gameinfo = g.id AND n.delete_at IS NULL
     ) gn ON TRUE
     WHERE g.delete_at IS NULL
       AND g.game_default = true)
    UNION ALL
    (SELECT
       s.id,
       s.uuid,
       s.teacher_uuid,
      ts.name AS teacher_name,
       s.create_by,
       s.exercise_name,
       s.description,
       s.subject,
      s.class AS class,
       NULL::varchar AS question_type,
       NULL::varchar AS game_type,
       s.thumbnail,
      s.status,
       to_char(s.create_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS create_at,
       to_char(s.update_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS update_at,
       to_char(s.delete_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS delete_at,
      NULL::text AS ban_at,
       'sequence' AS source,
       s.group_id,
       gr.name AS group_name,
       false AS game_default,
       s.sequence_default,
       sn.notes AS notes
     FROM sequence_info s
    LEFT JOIN teacher ts ON ts.uuid = s.teacher_uuid AND ts.delete_at IS NULL
     LEFT JOIN "group" gr ON s.group_id = gr.id
     LEFT JOIN LATERAL (
       SELECT COALESCE(
         json_agg(
           json_build_object(
             'id', n.id,
             'name', n.name,
             'detail', n.detail,
             'create_at', to_char(n.create_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
             'update_at', to_char(n.update_at, 'YYYY-MM-DD"T"HH24:MI:SS')
           )
           ORDER BY n.id DESC
         ),
         '[]'::json
       ) AS notes
       FROM note n
       WHERE n.id_sequenceinfo = s.id AND n.delete_at IS NULL
     ) sn ON TRUE
     WHERE s.delete_at IS NULL
       AND s.sequence_default = true)
    ORDER BY create_at DESC NULLS LAST
  `;

  const res = await pool.query(text);

  return res.rows.map((r: any) => ({
    unique_id: `${r.source}_${r.id}`,
    id: r.id,
    uuid: r.uuid ?? null,
    teacher_uuid: r.teacher_uuid ?? null,
    teacher_name: r.teacher_name ?? null,
    create_by: r.create_by ?? null,
    description: r.description ?? null,
    exercise_name: r.exercise_name ?? null,
    subject: r.subject ?? null,
    class: r.class ?? null,
    question_type: r.question_type ?? null,
    game_type: r.game_type ?? null,
    thumbnail: r.thumbnail ?? null,
    status: r.status ?? false,
    create_at: r.create_at ?? null,
    update_at: r.update_at ?? null,
    delete_at: r.delete_at ?? null,
    ban_at: r.ban_at ?? null,
    source: r.source as "game" | "sequence",
    group_id: r.group_id ?? null,
    group_name: r.group_name ?? null,
    game_default: r.game_default ?? false,
    sequence_default: r.sequence_default ?? false,
    notes: normalizeNotes(r.notes),
  }));
}

export async function getLibraryExceptGameDefault(): Promise<LibraryItem[]> {
  const text = `
    (SELECT
       g.id,
       g.uuid,
       g.teacher_uuid,
      tg.name AS teacher_name,
       g.create_by,
       g.exercise_name,
       g.description,
       g.subject,
      g.class,
       g.question_type,
       g.game_type,
       g.thumbnail,
      g.status,
       to_char(g.create_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS create_at,
       to_char(g.update_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS update_at,
       to_char(g.delete_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS delete_at,
      to_char(g.ban_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS ban_at,
       'game' AS source,
       g.group_id,
       gr.name AS group_name,
       gn.notes AS notes
     FROM game_info g
    LEFT JOIN teacher tg ON tg.uuid = g.teacher_uuid AND tg.delete_at IS NULL
    LEFT JOIN "group" gr ON g.group_id = gr.id
    LEFT JOIN LATERAL (
      SELECT COALESCE(
        json_agg(
          json_build_object(
            'id', n.id,
            'name', n.name,
            'detail', n.detail,
            'create_at', to_char(n.create_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
            'update_at', to_char(n.update_at, 'YYYY-MM-DD"T"HH24:MI:SS')
          )
          ORDER BY n.id DESC
        ),
        '[]'::json
      ) AS notes
      FROM note n
      WHERE n.id_gameinfo = g.id AND n.delete_at IS NULL
    ) gn ON TRUE
    WHERE g.delete_at IS NULL
      AND COALESCE(g.game_default, false) = false)
    UNION ALL
    (SELECT
       s.id,
       s.uuid,
       s.teacher_uuid,
      ts.name AS teacher_name,
       s.create_by,
       s.exercise_name,
       s.description,
       s.subject,
      s.class AS class,
       NULL::varchar AS question_type,
       NULL::varchar AS game_type,
       s.thumbnail,
      s.status,
       to_char(s.create_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS create_at,
       to_char(s.update_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS update_at,
       to_char(s.delete_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS delete_at,
      NULL::text AS ban_at,
       'sequence' AS source,
       s.group_id,
       gr.name AS group_name,
       sn.notes AS notes
     FROM sequence_info s
    LEFT JOIN teacher ts ON ts.uuid = s.teacher_uuid AND ts.delete_at IS NULL
     LEFT JOIN "group" gr ON s.group_id = gr.id
     LEFT JOIN LATERAL (
       SELECT COALESCE(
         json_agg(
           json_build_object(
             'id', n.id,
             'name', n.name,
             'detail', n.detail,
             'create_at', to_char(n.create_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
             'update_at', to_char(n.update_at, 'YYYY-MM-DD"T"HH24:MI:SS')
           )
           ORDER BY n.id DESC
         ),
         '[]'::json
       ) AS notes
       FROM note n
       WHERE n.id_sequenceinfo = s.id AND n.delete_at IS NULL
     ) sn ON TRUE
     WHERE s.delete_at IS NULL)
    ORDER BY create_at DESC NULLS LAST
  `;

  const res = await pool.query(text);

  return res.rows.map((r: any) => ({
    unique_id: `${r.source}_${r.id}`, // ID ใหม่จากการรวม source และ id
    id: r.id,
    uuid: r.uuid ?? null,
    teacher_uuid: r.teacher_uuid ?? null,
    teacher_name: r.teacher_name ?? null,
    create_by: r.create_by ?? null,
    exercise_name: r.exercise_name ?? null,
    description: r.description ?? null,
    subject: r.subject ?? null,
    class: r.class ?? null,
    question_type: r.question_type ?? null,
    game_type: r.game_type ?? null,
    thumbnail: r.thumbnail ?? null,
    status: r.status ?? false,
    create_at: r.create_at ?? null,
    update_at: r.update_at ?? null,
    delete_at: r.delete_at ?? null,
    ban_at: r.ban_at ?? null,
    source: r.source as "game" | "sequence",
    group_id: r.group_id ?? null,
    group_name: r.group_name ?? null,
    notes: normalizeNotes(r.notes),
  }));
}

export async function findLibraryItemByUuid(uuid: string): Promise<LibraryItemByUuidResult | null> {
  const gameText = `
      SELECT game_info.id, game_info.uuid, game_info.teacher_uuid, t.name AS teacher_name, game_info.create_by, game_info.exercise_name, game_info.description, game_info.subject, game_info.class, game_info.question_type, game_info.game_type, game_info.thumbnail, game_info.status, game_info.question_category_id, game_info.other_image, game_info.suggestion, game_info.group_id,
           to_char(create_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS create_at,
           to_char(update_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS update_at,
           to_char(delete_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS delete_at,
           to_char(ban_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS ban_at,
           (
             SELECT COALESCE(
               json_agg(
                 json_build_object(
                   'id', n.id,
                   'name', n.name,
                   'detail', n.detail,
                   'create_at', to_char(n.create_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
                   'update_at', to_char(n.update_at, 'YYYY-MM-DD"T"HH24:MI:SS')
                 )
                 ORDER BY n.id DESC
               ),
               '[]'::json
             )
             FROM note n
             WHERE n.id_gameinfo = game_info.id AND n.delete_at IS NULL
           ) AS notes
    FROM game_info
    LEFT JOIN teacher t ON t.uuid = game_info.teacher_uuid AND t.delete_at IS NULL
    WHERE uuid = $1
    LIMIT 1
  `;

  const gameRes = await pool.query(gameText, [uuid]);
  if (gameRes.rowCount && gameRes.rowCount > 0) {
    const gameInfo = gameRes.rows[0];
    return {
      source: "game",
      game_info: {
        ...gameInfo,
        notes: normalizeNotes(gameInfo.notes),
      },
    };
  }

  const sequenceText = `
      SELECT sequence_info.id, sequence_info.uuid, sequence_info.teacher_uuid, t.name AS teacher_name, sequence_info.create_by, sequence_info.exercise_name, sequence_info.subject, sequence_info.class, sequence_info.thumbnail, sequence_info.status, sequence_info.group_id,
           to_char(create_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS create_at,
           to_char(update_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS update_at,
           to_char(delete_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS delete_at,
           (
             SELECT COALESCE(
               json_agg(
                 json_build_object(
                   'id', n.id,
                   'name', n.name,
                   'detail', n.detail,
                   'create_at', to_char(n.create_at, 'YYYY-MM-DD"T"HH24:MI:SS'),
                   'update_at', to_char(n.update_at, 'YYYY-MM-DD"T"HH24:MI:SS')
                 )
                 ORDER BY n.id DESC
               ),
               '[]'::json
             )
             FROM note n
             WHERE n.id_sequenceinfo = sequence_info.id AND n.delete_at IS NULL
           ) AS notes
    FROM sequence_info
    LEFT JOIN teacher t ON t.uuid = sequence_info.teacher_uuid AND t.delete_at IS NULL
    WHERE uuid = $1
    LIMIT 1
  `;

  const sequenceRes = await pool.query(sequenceText, [uuid]);
  if (sequenceRes.rowCount && sequenceRes.rowCount > 0) {
    const sequenceInfo = sequenceRes.rows[0];
    return {
      source: "sequence",
      sequence_info: {
        ...sequenceInfo,
        notes: normalizeNotes(sequenceInfo.notes),
      },
    };
  }

  return null;
}