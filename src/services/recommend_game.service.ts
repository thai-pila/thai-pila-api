import pool from './db';

export interface RecommendGameCreateResult {
    id: number;
    id_gameinfo: number;
    create_at: string;
    update_at: string;
    delete_at: string | null;
}

export interface RecommendGameListItem {
    id: number;
    no: number | null;
    uuid: string;
    teacher_uuid: string | null;
    create_by: string | null;
    exercise_name: string | null;
    description: string | null;
    subject: string | null;
    question_type: string | null;
    game_type: string | null;
    thumbnail: string | null;
    question_category_id: number | null;
    group_id: number | null;
    game_default: boolean;
    status: boolean;
    create_at: string;
    delete_at: string | null;
}

export interface RecommendGameOrderUpdateResult {
    id: number;
    id_gameinfo: number;
    no: number | null;
    update_at: string;
}

export async function createRecommendGameByGameId(
    gameId: number | number[]
): Promise<RecommendGameCreateResult | RecommendGameCreateResult[]> {
    const gameIds = Array.isArray(gameId) ? gameId : [gameId];

    const text = `
        INSERT INTO recommend_game (id_gameinfo)
        SELECT DISTINCT gid
        FROM UNNEST($1::int[]) AS gid
        RETURNING id, id_gameinfo, create_at, update_at, delete_at
    `;

    const res = await pool.query(text, [gameIds]);

    if (Array.isArray(gameId)) {
        return res.rows;
    }

    return res.rows[0];
}

export async function findAllRecommendGames(): Promise<RecommendGameListItem[]> {
    const text = `
        SELECT
            gi.id,
            rg.no,
            gi.uuid,
            gi.teacher_uuid,
            gi.create_by,
            gi.exercise_name,
            gi.description,
            gi.subject,
            gi.question_type,
            gi.game_type,
            gi.thumbnail,
            gi.question_category_id,
            gi.group_id,
            gi.game_default,
            gi.status,
            gi.create_at,
            gi.delete_at
        FROM recommend_game rg
        INNER JOIN game_info gi ON gi.id = rg.id_gameinfo
        WHERE rg.delete_at IS NULL
          AND gi.delete_at IS NULL
                ORDER BY rg.no ASC NULLS LAST, rg.create_at DESC
    `;

    const res = await pool.query(text
    );
    return res.rows;
}

export async function updateRecommendGameNoByGameId(
    gameId: number,
    no: number
): Promise<RecommendGameOrderUpdateResult | null> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const currentRes = await client.query(
            `
            SELECT id, id_gameinfo, no, update_at
            FROM recommend_game
            WHERE id_gameinfo = $1 AND delete_at IS NULL
            FOR UPDATE
            `,
            [gameId]
        );

        if ((currentRes.rowCount ?? 0) === 0) {
            await client.query('ROLLBACK');
            return null;
        }

        const current = currentRes.rows[0];
        const currentNo = current.no as number | null;

        if (currentNo === no) {
            await client.query('COMMIT');
            return current;
        }

        const targetRes = await client.query(
            `
            SELECT id, id_gameinfo, no
            FROM recommend_game
            WHERE no = $1
              AND delete_at IS NULL
            FOR UPDATE
            `,
            [no]
        );

        if ((targetRes.rowCount ?? 0) > 0) {
            const target = targetRes.rows[0];

            await client.query(
                `
                UPDATE recommend_game
                SET no = $1,
                    update_at = CURRENT_TIMESTAMP
                WHERE id = $2
                `,
                [currentNo, target.id]
            );
        }

        const updatedRes = await client.query(
            `
            UPDATE recommend_game
            SET no = $1,
                update_at = CURRENT_TIMESTAMP
            WHERE id_gameinfo = $2
              AND delete_at IS NULL
            RETURNING id, id_gameinfo, no, update_at
            `,
            [no, gameId]
        );

        await client.query('COMMIT');
        return updatedRes.rows[0] ?? null;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function deleteRecommendGameByGameId(gameId: number): Promise<number> {
    const text = `
        DELETE FROM recommend_game
        WHERE id_gameinfo = $1
    `;

    const res = await pool.query(text, [gameId]);
    return res.rowCount ?? 0; 
}
