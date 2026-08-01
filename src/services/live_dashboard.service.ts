import pool from "./db";

export interface UpsertLiveDashboardPayload {
    teacher_uuid?: string | null;
    student_uuid: string;
    student_name?: string | null;
    uuid_sequence_info?: string | null;
    uuid_game_info?: string | null;
    game_information: string | Record<string, unknown> | unknown[];
}

export interface LiveDashboardRow {
    id: number;
    teacher_uuid: string | null;
    student_uuid: string;
    student_name: string | null;
    uuid_sequence_info: string | null;
    uuid_game_info: string | null;
    game_information: string;
    create_at: string;
    update_at: string;
    delete_at: string | null;
}

export interface LiveDashboardStudentRow {
    student_uuid: string;
    student_name: string | null;
}

function normalizeGameInformation(input: UpsertLiveDashboardPayload['game_information']): string {
    if (typeof input === 'string') {
        return input;
    }
    return JSON.stringify(input ?? {});
}

function hasSequenceValue(value?: string | null): value is string {
    if (value === undefined || value === null) {
        return false;
    }
    return String(value).trim() !== '';
}

export async function upsertLiveDashboard(payload: UpsertLiveDashboardPayload): Promise<LiveDashboardRow> {
    const gameInformationText = normalizeGameInformation(payload.game_information);
    const teacherUuid = payload.teacher_uuid ?? null;
    const studentUuid = payload.student_uuid;
    const studentName = payload.student_name ?? null;
    const sequenceUuid = hasSequenceValue(payload.uuid_sequence_info) ? payload.uuid_sequence_info : null;
    const gameUuid = hasSequenceValue(payload.uuid_game_info) ? payload.uuid_game_info : null;

    if (!sequenceUuid && !gameUuid) {
        const err = new Error('uuid_sequence_info_or_uuid_game_info_required');
        (err as any).code = 'LIVE_DASHBOARD_UUID_REQUIRED';
        throw err;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        if (sequenceUuid) {
            const updateWithSequenceSql = `
				UPDATE live_dashboard
				SET
					teacher_uuid = $1,
					student_name = $2,
                    game_information = $3,
                    update_at = CURRENT_TIMESTAMP
				WHERE student_uuid = $4
				  AND uuid_sequence_info = $5
                  AND uuid_game_info IS NOT DISTINCT FROM $6
				  AND delete_at IS NULL
				RETURNING id, teacher_uuid, student_uuid, student_name, uuid_sequence_info, uuid_game_info, game_information, create_at, update_at, delete_at
			`;

            const updated = await client.query<LiveDashboardRow>(updateWithSequenceSql, [
                teacherUuid,
                studentName,
                gameInformationText,
                studentUuid,
                sequenceUuid,
                gameUuid,
            ]);

            if ((updated.rowCount ?? 0) > 0) {
                await client.query('COMMIT');
                return updated.rows[0];
            }

            const insertWithSequenceSql = `
				INSERT INTO live_dashboard (teacher_uuid, student_uuid, student_name, uuid_sequence_info, uuid_game_info, game_information)
				VALUES ($1, $2, $3, $4, $5, $6)
				RETURNING id, teacher_uuid, student_uuid, student_name, uuid_sequence_info, uuid_game_info, game_information, create_at, update_at, delete_at
			`;

            const inserted = await client.query<LiveDashboardRow>(insertWithSequenceSql, [
                teacherUuid,
                studentUuid,
                studentName,
                sequenceUuid,
                gameUuid,
                gameInformationText,
            ]);

            await client.query('COMMIT');
            return inserted.rows[0];
        }

        const updateWithoutSequenceSql = `
			UPDATE live_dashboard
			SET
				teacher_uuid = $1,
				student_name = $2,
                game_information = $3,
                update_at = CURRENT_TIMESTAMP
			WHERE student_uuid = $4
			  AND uuid_sequence_info IS NULL
			  AND uuid_game_info = $5
			  AND delete_at IS NULL
			RETURNING id, teacher_uuid, student_uuid, student_name, uuid_sequence_info, uuid_game_info, game_information, create_at, update_at, delete_at
		`;

        const updated = await client.query<LiveDashboardRow>(updateWithoutSequenceSql, [
            teacherUuid,
            studentName,
            gameInformationText,
            studentUuid,
            gameUuid,
        ]);

        if ((updated.rowCount ?? 0) > 0) {
            await client.query('COMMIT');
            return updated.rows[0];
        }

        const insertWithoutSequenceSql = `
			INSERT INTO live_dashboard (teacher_uuid, student_uuid, student_name, uuid_sequence_info, uuid_game_info, game_information)
			VALUES ($1, $2, $3, NULL, $4, $5)
			RETURNING id, teacher_uuid, student_uuid, student_name, uuid_sequence_info, uuid_game_info, game_information, create_at, update_at, delete_at
		`;

        const inserted = await client.query<LiveDashboardRow>(insertWithoutSequenceSql, [
            teacherUuid,
            studentUuid,
            studentName,
            gameUuid,
            gameInformationText,
        ]);

        await client.query('COMMIT');
        return inserted.rows[0];
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function getAllLiveDashboards(): Promise<LiveDashboardRow[]> {
    const client = await pool.connect();
    try {
        const result = await client.query<LiveDashboardRow>(`
            SELECT id, teacher_uuid, student_uuid, student_name, uuid_sequence_info, uuid_game_info, game_information, create_at, update_at, delete_at
            FROM live_dashboard
            WHERE delete_at IS NULL
        `);
        return result.rows;
    } finally {
        client.release();
    }
}

export async function getLiveDashboardById(id: number): Promise<LiveDashboardRow | null> {
    const client = await pool.connect();
    try {
        const result = await client.query<LiveDashboardRow>(`
            SELECT id, teacher_uuid, student_uuid, student_name, uuid_sequence_info, uuid_game_info, game_information, create_at, update_at, delete_at
            FROM live_dashboard
            WHERE id = $1 AND delete_at IS NULL
        `, [id]);
        return result.rows[0] || null;
    } finally {
        client.release();
    }
}

export async function getLiveDashboardsByTeacherUuid(teacher_uuid: string): Promise<LiveDashboardRow[]> {
    const client = await pool.connect();
    try {
        const result = await client.query<LiveDashboardRow>(`
            SELECT id, teacher_uuid, student_uuid, student_name, uuid_sequence_info, uuid_game_info, game_information, create_at, update_at, delete_at
            FROM live_dashboard
            WHERE teacher_uuid = $1 AND delete_at IS NULL
        `, [teacher_uuid]);
        return result.rows;
    } finally {
        client.release();
    }
}

export async function getLiveDashboardsByStudentUuid(student_uuid: string): Promise<LiveDashboardRow[]> {
    const client = await pool.connect();
    try {
        const result = await client.query<LiveDashboardRow>(`
            SELECT id, teacher_uuid, student_uuid, student_name, uuid_sequence_info, uuid_game_info, game_information, create_at, update_at, delete_at
            FROM live_dashboard
            WHERE student_uuid = $1 AND delete_at IS NULL
        `, [student_uuid]);
        return result.rows;
    } finally {
        client.release();
    }
}

export async function getLiveDashboardStudentsByGameOrSequence(params: {
    uuid_game_info?: string | null;
    uuid_sequence_info?: string | null;
}): Promise<LiveDashboardStudentRow[]> {
    const gameUuid = params.uuid_game_info ?? null;
    const sequenceUuid = params.uuid_sequence_info ?? null;

    const client = await pool.connect();
    try {
        if (gameUuid && sequenceUuid) {
            const result = await client.query<LiveDashboardStudentRow>(`
                SELECT DISTINCT student_uuid, student_name
                FROM live_dashboard
                WHERE delete_at IS NULL
                  AND (uuid_game_info = $1 OR uuid_sequence_info = $2)
                ORDER BY student_uuid ASC
            `, [gameUuid, sequenceUuid]);
            return result.rows;
        }

        if (gameUuid) {
            const result = await client.query<LiveDashboardStudentRow>(`
                SELECT DISTINCT student_uuid, student_name
                FROM live_dashboard
                WHERE delete_at IS NULL
                  AND uuid_game_info = $1
                ORDER BY student_uuid ASC
            `, [gameUuid]);
            return result.rows;
        }

        const result = await client.query<LiveDashboardStudentRow>(`
            SELECT DISTINCT student_uuid, student_name
            FROM live_dashboard
            WHERE delete_at IS NULL
              AND uuid_sequence_info = $1
            ORDER BY student_uuid ASC
        `, [sequenceUuid]);
        return result.rows;
    } finally {
        client.release();
    }
}

