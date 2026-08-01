import pool from './db';

type CreateTeacherIfNotExistsResult = {
	inserted: boolean;
	teacher?: {
		id: number;
		uuid: string;
		name: string;
		create_at?: string;
	};
};

export type TeacherRecord = {
	id: number;
	uuid: string;
	name: string;
	create_at: string;
};

export async function findTeacherByUuid(uuid: string): Promise<TeacherRecord | null> {
	const res = await pool.query(
		`SELECT id, uuid, name, to_char(create_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS create_at
		 FROM teacher
		 WHERE uuid = $1 AND delete_at IS NULL
		 LIMIT 1`,
		[uuid]
	);

	if (!res.rowCount || res.rowCount === 0) {
		return null;
	}

	return res.rows[0] as TeacherRecord;
}

export async function createTeacherIfNotExists(uuid: string, name: string): Promise<CreateTeacherIfNotExistsResult> {
	try {
		const insertResult = await pool.query(
			`
			INSERT INTO teacher (uuid, name)
			VALUES ($1, $2)
			ON CONFLICT (uuid) DO NOTHING
			RETURNING id, uuid, name, to_char(create_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS create_at
			`,
			[uuid, name]
		);

		if (insertResult.rowCount && insertResult.rowCount > 0) {
			return {
				inserted: true,
				teacher: insertResult.rows[0],
			};
		}

		return {
			inserted: false,
		};
	} catch (error: any) {
		throw new Error(error.message || 'Failed to create teacher');
	}
}

export async function countTeacher(): Promise<number> {
    const res = await pool.query(
        `SELECT COUNT(*) AS count
         FROM teacher
         WHERE delete_at IS NULL 
         AND name NOT LIKE '%admin%'`
    );
    return Number(res.rows[0].count) || 0;
}

export async function getAllTeacherNameCountCreateGameRanking() {
    const res = await pool.query(
        `SELECT name, COUNT(*) AS create_game_count
         FROM teacher
         JOIN game_info ON teacher.uuid = game_info.teacher_uuid
         WHERE teacher.delete_at IS NULL
			AND game_info.delete_at IS NULL
			AND name NOT LIKE '%admin%'
			GROUP BY name
         ORDER BY create_game_count DESC`
    );
    return res.rows;
}