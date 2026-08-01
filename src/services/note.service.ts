import pool from './db';

export interface CreateNotePayload {
	name?: string;
	detail?: string | null;
	id_gameinfo?: number;
	id_sequenceinfo?: number;
	teacher_uuid?: string | null;
}

export interface UpdateNotePayload {
	name?: string;
	detail?: string | null;
	id_gameinfo?: number | null;
	id_sequenceinfo?: number | null;
	teacher_uuid?: string | null;
}

interface NoteReferenceByIdParams {
	id_gameinfo?: number;
	id_sequenceinfo?: number;
}

type ResolvedReference =
	| { source: 'game'; gameUuid: string }
	| { source: 'sequence'; sequenceUuid: string };

function validateExactlyOneReference(id_gameinfo?: number | null, id_sequenceinfo?: number | null) {
	const hasGame = Number.isInteger(id_gameinfo) && Number(id_gameinfo) > 0;
	const hasSequence = Number.isInteger(id_sequenceinfo) && Number(id_sequenceinfo) > 0;

	if ((hasGame && hasSequence) || (!hasGame && !hasSequence)) {
		const err: any = new Error('provide exactly one of id_gameinfo or id_sequenceinfo');
		err.code = 'NOTE_INVALID_REFERENCE';
		throw err;
	}
}

const NOTE_SELECT = `
	SELECT
		n.id,
		n.name,
		n.detail,
		n.id_gameinfo,
		n.id_sequenceinfo,
		n.teacher_uuid,
		n.create_at,
		n.update_at,
		n.delete_at,
		gi.uuid AS game_uuid,
		si.uuid AS sequence_uuid
	FROM note n
	LEFT JOIN game_info gi ON gi.id = n.id_gameinfo
	LEFT JOIN sequence_info si ON si.id = n.id_sequenceinfo
`;

export async function createNote(payload: CreateNotePayload) {
	const name = String(payload.name ?? '').trim();
	if (!name) {
		const err: any = new Error('name is required');
		err.code = 'NOTE_NAME_REQUIRED';
		throw err;
	}

	const id_gameinfo = payload.id_gameinfo;
	const id_sequenceinfo = payload.id_sequenceinfo;
	const teacher_uuid = typeof payload.teacher_uuid === 'string'
		? payload.teacher_uuid.trim() || null
		: payload.teacher_uuid ?? null;
	validateExactlyOneReference(id_gameinfo, id_sequenceinfo);

	const text = `
		INSERT INTO note (name, detail, id_gameinfo, id_sequenceinfo, teacher_uuid)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, name, detail, id_gameinfo, id_sequenceinfo, teacher_uuid, create_at, update_at, delete_at
	`;

	const values = [name, payload.detail ?? null, id_gameinfo ?? null, id_sequenceinfo ?? null, teacher_uuid];
	const res = await pool.query(text, values);
	return res.rows[0];
}

export async function updateNoteById(id: number, payload: UpdateNotePayload) {
	const existingRes = await pool.query(
		'SELECT id, name, detail, id_gameinfo, id_sequenceinfo, teacher_uuid, delete_at FROM note WHERE id = $1 LIMIT 1',
		[id]
	);

	if (existingRes.rowCount === 0) {
		return null;
	}

	const existing = existingRes.rows[0];

	const nextName = Object.prototype.hasOwnProperty.call(payload, 'name')
		? String(payload.name ?? '').trim()
		: String(existing.name ?? '').trim();

	if (!nextName) {
		const err: any = new Error('name is required');
		err.code = 'NOTE_NAME_REQUIRED';
		throw err;
	}

	const nextGameId = Object.prototype.hasOwnProperty.call(payload, 'id_gameinfo')
		? payload.id_gameinfo ?? null
		: existing.id_gameinfo;

	const nextSequenceId = Object.prototype.hasOwnProperty.call(payload, 'id_sequenceinfo')
		? payload.id_sequenceinfo ?? null
		: existing.id_sequenceinfo;

	const nextTeacherUuid = Object.prototype.hasOwnProperty.call(payload, 'teacher_uuid')
		? (typeof payload.teacher_uuid === 'string' ? payload.teacher_uuid.trim() || null : payload.teacher_uuid ?? null)
		: existing.teacher_uuid;

	validateExactlyOneReference(nextGameId, nextSequenceId);

	const updates: string[] = [];
	const values: any[] = [];
	let idx = 1;

	if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
		updates.push(`name = $${idx++}`);
		values.push(nextName);
	}

	if (Object.prototype.hasOwnProperty.call(payload, 'detail')) {
		updates.push(`detail = $${idx++}`);
		values.push(payload.detail ?? null);
	}

	if (Object.prototype.hasOwnProperty.call(payload, 'id_gameinfo')) {
		updates.push(`id_gameinfo = $${idx++}`);
		values.push(nextGameId);
	}

	if (Object.prototype.hasOwnProperty.call(payload, 'id_sequenceinfo')) {
		updates.push(`id_sequenceinfo = $${idx++}`);
		values.push(nextSequenceId);
	}

	if (Object.prototype.hasOwnProperty.call(payload, 'teacher_uuid')) {
		updates.push(`teacher_uuid = $${idx++}`);
		values.push(nextTeacherUuid);
	}

	if (updates.length === 0) {
		const err: any = new Error('no updatable fields provided');
		err.code = 'NOTE_NO_UPDATES';
		throw err;
	}

	const text = `
		UPDATE note
		SET ${updates.join(', ')}, update_at = CURRENT_TIMESTAMP
		WHERE id = $${idx}
		RETURNING id, name, detail, id_gameinfo, id_sequenceinfo, teacher_uuid, create_at, update_at, delete_at
	`;

	values.push(id);
	const res = await pool.query(text, values);
	return res.rows[0] ?? null;
}

export async function findAllNotes() {
	const res = await pool.query(
		`
		${NOTE_SELECT}
		WHERE n.delete_at IS NULL
		ORDER BY n.id DESC
		`
	);
	return res.rows;
}

export async function findNoteById(id: number) {
	const res = await pool.query(
		`
		${NOTE_SELECT}
		WHERE n.id = $1 AND n.delete_at IS NULL
		LIMIT 1
		`,
		[id]
	);
	return res.rows[0] ?? null;
}

async function resolveReferenceByUuid(inputUuid: string): Promise<ResolvedReference | null> {
	const mappingRes = await pool.query(
		`
		SELECT uuid_newgen, uuid_gameinfo, uuid_sequenceinfo
		FROM uuid_for_pila
		WHERE uuid_newgen = $1 OR uuid_gameinfo = $1 OR uuid_sequenceinfo = $1
		ORDER BY
			CASE
				WHEN uuid_newgen = $1 THEN 0
				WHEN uuid_gameinfo = $1 THEN 1
				WHEN uuid_sequenceinfo = $1 THEN 2
				ELSE 3
			END,
			create_at DESC,
			id DESC
		LIMIT 1
		`,
		[inputUuid]
	);

	if ((mappingRes.rowCount ?? 0) > 0) {
		const row = mappingRes.rows[0];
		if (row.uuid_gameinfo) {
			return { source: 'game', gameUuid: String(row.uuid_gameinfo) };
		}
		if (row.uuid_sequenceinfo) {
			return { source: 'sequence', sequenceUuid: String(row.uuid_sequenceinfo) };
		}
	}

	const directGameRes = await pool.query(
		'SELECT uuid FROM game_info WHERE uuid = $1 AND delete_at IS NULL LIMIT 1',
		[inputUuid]
	);
	if ((directGameRes.rowCount ?? 0) > 0) {
		return { source: 'game', gameUuid: String(directGameRes.rows[0].uuid) };
	}

	const directSequenceRes = await pool.query(
		'SELECT uuid FROM sequence_info WHERE uuid = $1 AND delete_at IS NULL LIMIT 1',
		[inputUuid]
	);
	if ((directSequenceRes.rowCount ?? 0) > 0) {
		return { source: 'sequence', sequenceUuid: String(directSequenceRes.rows[0].uuid) };
	}

	return null;
}

export async function findNotesByGameUuidOrSequenceUuidOrUuidNewgen(inputUuid: string) {
	const normalized = String(inputUuid ?? '').trim();
	if (!normalized) {
		const err: any = new Error('uuid is required');
		err.code = 'NOTE_UUID_REQUIRED';
		throw err;
	}

	const resolved = await resolveReferenceByUuid(normalized);
	if (!resolved) {
		return null;
	}

	if (resolved.source === 'game') {
		const res = await pool.query(
			`
			${NOTE_SELECT}
			WHERE gi.uuid = $1 AND n.delete_at IS NULL
			ORDER BY n.id DESC
			`,
			[resolved.gameUuid]
		);

		return {
			source: 'game' as const,
			// resolved_uuid: resolved.gameUuid,
			// input_uuid: normalized,
			notes: res.rows,
		};
	}

	const res = await pool.query(
		`
		${NOTE_SELECT}
		WHERE si.uuid = $1 AND n.delete_at IS NULL
		ORDER BY n.id DESC
		`,
		[resolved.sequenceUuid]
	);

	return {
		source: 'sequence' as const,
		// resolved_uuid: resolved.sequenceUuid,
		// input_uuid: normalized,
		notes: res.rows,
	};
}

export async function findNotesByTeacherUuid(teacherUuid: string) {
	const normalized = String(teacherUuid ?? '').trim();
	if (!normalized) {
		const err: any = new Error('teacherUuid is required');
		err.code = 'NOTE_TEACHER_UUID_REQUIRED';
		throw err;
	}

	const res = await pool.query(
		`
		${NOTE_SELECT}
		WHERE n.delete_at IS NULL
		  AND (
			n.teacher_uuid = $1
			OR n.id_gameinfo IN (SELECT id FROM game_info WHERE teacher_uuid = $1 AND delete_at IS NULL)
			OR n.id_sequenceinfo IN (SELECT id FROM sequence_info WHERE teacher_uuid = $1 AND delete_at IS NULL)
		  )
		ORDER BY n.id DESC
		`,
		[normalized]
	);

	return res.rows;
}

export async function softDeleteNoteById(id: number) {
	const res = await pool.query(
		`
		UPDATE note
		SET delete_at = CURRENT_TIMESTAMP, update_at = CURRENT_TIMESTAMP
		WHERE id = $1 AND delete_at IS NULL
		RETURNING id, name, detail, id_gameinfo, id_sequenceinfo, teacher_uuid, create_at, update_at, delete_at
		`,
		[id]
	);
	return res.rows[0] ?? null;
}

export async function hardDeleteNoteById(id: number) {
	const res = await pool.query(
		`
		DELETE FROM note
		WHERE id = $1
		RETURNING id, name, detail, id_gameinfo, id_sequenceinfo, teacher_uuid, create_at, update_at, delete_at
		`,
		[id]
	);
	return res.rows[0] ?? null;
}