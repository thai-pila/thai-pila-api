import pool from './db'

export interface Group {
    id?: number;
    name: string;
    teacher_uuid?: string | null;
	isadmin?: boolean;
}

export interface UpdateGroupInput {
	name?: string;
	teacher_uuid?: string | null;
}

export async function createGroup(payload: Group): Promise<Group> {
    const text = 'INSERT INTO "group"(name, teacher_uuid, isadmin) VALUES($1, $2, $3) RETURNING id, name, teacher_uuid, isadmin';
    const values = [payload.name, payload.teacher_uuid ?? null, payload.isadmin ?? false];
    const res = await pool.query(text, values);
    return res.rows[0];
}

export async function findGroupById(id: number): Promise<Group | null> {
    const res = await pool.query('SELECT id, name, teacher_uuid, isadmin FROM "group" WHERE id = $1 AND delete_at IS NULL', [id]);
    return res.rows[0] ?? null;
}

export async function findAllGroups(): Promise<Group[]> {
    const res = await pool.query('SELECT id, name, teacher_uuid, isadmin FROM "group" WHERE delete_at IS NULL');
    return res.rows;
}

export async function findGroupByTeacherUUID(teacher_uuid: string): Promise<Group[]> {
    const res = await pool.query(
		'SELECT id, name, teacher_uuid, isadmin FROM "group" WHERE (teacher_uuid = $1 OR isadmin IS TRUE) AND delete_at IS NULL', 
		[teacher_uuid]);
    return res.rows;
}

export async function updateGroupById(id: number, payload: UpdateGroupInput): Promise<Group> {
	if (!Number.isInteger(id) || id <= 0) {
		throw new Error('invalid group id');
	}

	const updates: string[] = [];
	const values: Array<string | number | null> = [];
	let idx = 1;

	if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
		if (typeof payload.name !== 'string' || payload.name.trim() === '') {
			throw new Error('name is required');
		}
		updates.push(`name = $${idx++}`);
		values.push(payload.name.trim());
	}

	if (Object.prototype.hasOwnProperty.call(payload, 'teacher_uuid')) {
		updates.push(`teacher_uuid = $${idx++}`);
		values.push(payload.teacher_uuid ?? null);
	}

	if (updates.length === 0) {
		throw new Error('no updatable fields provided');
	}

	values.push(id);
	const query = `
		UPDATE "group"
		SET ${updates.join(', ')}
		WHERE id = $${idx}
		RETURNING id, name, teacher_uuid
	`;

	const res = await pool.query(query, values);
	if (res.rowCount === 0) {
		throw new Error('group not found');
	}

	return res.rows[0];
}

export async function hardDeleteGroupById(id: number): Promise<{ deleted: boolean }> {
	if (!Number.isInteger(id) || id <= 0) {
		throw new Error('invalid group id');
	}

	const res = await pool.query('DELETE FROM "group" WHERE id = $1 RETURNING id', [id]);
	if (res.rowCount === 0) {
		throw new Error('group not found');
	}

	return { deleted: true };
}

export async function softDeleteGroupById(id: number) {
    const text = `
        UPDATE "group"
        SET delete_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, name, teacher_uuid, isadmin, create_at, update_at, delete_at
    `;
    const res = await pool.query(text, [id]);
    return res.rows[0];
}