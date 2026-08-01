import pool from './db';

export interface PopularGameCreateResult {
	id: number;
	id_gameinfo: number;
	create_at: string;
}

export interface PopularGameRankingItem {
	rank_no: number;
	game_id: number;
	total_popular: number;
	game_info: {
		id: number;
		uuid: string | null;
		create_by: string | null;
		exercise_name: string | null;
		subject: string | null;
		question_type: string | null;
		game_type: string | null;
		thumbnail: string | null;
		status: boolean;
	};
}

export async function createPopularGameByGameId(gameId: number): Promise<PopularGameCreateResult> {
	const text = `
		INSERT INTO popular_game (id_gameinfo)
		VALUES ($1)
		RETURNING id, id_gameinfo, create_at
	`;

	const res = await pool.query(text, [gameId]);
	return res.rows[0];
}

export async function findTopPopularGames(limit = 10): Promise<PopularGameRankingItem[]> {
	const safeLimit = Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 10;

	const text = `
		SELECT
			ROW_NUMBER() OVER (ORDER BY COUNT(pg.id_gameinfo) DESC, gi.id ASC) AS rank_no,
			gi.id AS game_id,
			COUNT(pg.id_gameinfo)::int AS total_popular,
			gi.id,
			gi.uuid,
			gi.create_by,
			gi.exercise_name,
			gi.subject,
			gi.question_type,
			gi.game_type,
			gi.thumbnail,
			gi.status
		FROM popular_game pg
		JOIN game_info gi ON gi.id = pg.id_gameinfo
		WHERE gi.delete_at IS NULL
		GROUP BY gi.id, gi.uuid, gi.create_by, gi.exercise_name, gi.subject, gi.question_type, gi.game_type, gi.thumbnail, gi.status
		ORDER BY total_popular DESC, gi.id ASC
		LIMIT $1
	`;

	const res = await pool.query(text, [safeLimit]);
	return res.rows.map((row: any) => ({
		rank_no: Number(row.rank_no),
		game_id: Number(row.game_id),
		total_popular: Number(row.total_popular),
		game_info: {
			id: Number(row.id),
			uuid: row.uuid ?? null,
			create_by: row.create_by ?? null,
			exercise_name: row.exercise_name ?? null,
			subject: row.subject ?? null,
			question_type: row.question_type ?? null,
			game_type: row.game_type ?? null,
			thumbnail: row.thumbnail ?? null,
			status: Boolean(row.status),
		},
	}));
}