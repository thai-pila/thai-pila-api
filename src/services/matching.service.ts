import pool from "./db";

export interface CreateMatchingInput {
	no: number;
	keyword?: string | null;
	matching_word?: string | null;
	hint?: string | null;
	sound_keyword?: string | null;
	image_keyword?: string | null;
	sound_hint?: string | null;
	image_hint?: string | null;
	sound_matching_word?: string | null;
	image_matching_word?: string | null;
	skill_listening_speaking?: boolean;
	skill_lang_nature?: boolean;
	skill_reading?: boolean;
	skill_writing?: boolean;
	audio_question?: boolean;
	audio_choice?: boolean;
	audio_assistant_voice?: boolean;
	audio_background?: boolean;
	expected_time?: number;
}

export interface UpdateMatchingInput {
	no?: number;
	keyword?: string | null;
	matching_word?: string | null;
	hint?: string | null;
	sound_keyword?: string | null;
	image_keyword?: string | null;
	sound_hint?: string | null;
	image_hint?: string | null;
	sound_matching_word?: string | null;
	image_matching_word?: string | null;
	skill_listening_speaking?: boolean;
	skill_lang_nature?: boolean;
	skill_reading?: boolean;
	skill_writing?: boolean;
	audio_question?: boolean;
	audio_choice?: boolean;
	audio_assistant_voice?: boolean;
	audio_background?: boolean;
	expected_time?: number;
}

const ALLOWED_MATCHING_MEDIA_FIELDS = [
	"sound_keyword",
	"sound_matching_word",
	"image_keyword",
	"image_matching_word",
	"hint",
	"sound_hint",
	"image_hint"
] as const;

export type MatchingMediaField = (typeof ALLOWED_MATCHING_MEDIA_FIELDS)[number];

function toMatchingMediaField(field: string): MatchingMediaField {
	if ((ALLOWED_MATCHING_MEDIA_FIELDS as readonly string[]).includes(field)) {
		return field as MatchingMediaField;
	}

	throw new Error("invalid matching media field");
}

async function resolveMatchingTableName(client: any): Promise<string> {
	const result = await client.query(
		`SELECT
			COALESCE(to_regclass('public.matching')::text, to_regclass('public.matching_question')::text) AS table_name`
	);

	const tableName = result.rows?.[0]?.table_name;
	if (!tableName) {
		throw new Error("matching table not found");
	}

	return tableName;
}

export async function createMatchingByGameId(idGameInfo: number, matchings: CreateMatchingInput[]) {
	if (!Number.isInteger(idGameInfo) || idGameInfo <= 0) {
		throw new Error("id_game_info must be a positive integer");
	}
	if (!Array.isArray(matchings) || matchings.length === 0) {
		throw new Error("matchings must be a non-empty array");
	}

	const noSet = new Set<number>();
	for (const item of matchings) {
		if (!Number.isInteger(item.no)) throw new Error("each matching.no must be integer");
		if (noSet.has(item.no)) throw new Error("matching no must be unique in the request");
		noSet.add(item.no);

		if (item.keyword !== undefined && item.keyword !== null && typeof item.keyword !== "string") {
			throw new Error("each matching.keyword must be a string");
		}
		if (item.matching_word !== undefined && item.matching_word !== null && typeof item.matching_word !== "string") {
			throw new Error("each matching.matching_word must be a string");
		}
		if (
			Object.prototype.hasOwnProperty.call(item, "skill_listening_speaking") &&
			typeof item.skill_listening_speaking !== "boolean"
		) {
			throw new Error("matching.skill_listening_speaking must be boolean");
		}
		if (
			Object.prototype.hasOwnProperty.call(item, "skill_lang_nature") &&
			typeof item.skill_lang_nature !== "boolean"
		) {
			throw new Error("matching.skill_lang_nature must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "skill_reading") && typeof item.skill_reading !== "boolean") {
			throw new Error("matching.skill_reading must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "skill_writing") && typeof item.skill_writing !== "boolean") {
			throw new Error("matching.skill_writing must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "audio_question") && typeof item.audio_question !== "boolean") {
			throw new Error("matching.audio_question must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "audio_choice") && typeof item.audio_choice !== "boolean") {
			throw new Error("matching.audio_choice must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "audio_assistant_voice") && typeof item.audio_assistant_voice !== "boolean") {
			throw new Error("matching.audio_assistant_voice must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "audio_background") && typeof item.audio_background !== "boolean") {
			throw new Error("matching.audio_background must be boolean");
		}
		if (
			Object.prototype.hasOwnProperty.call(item, "expected_time") &&
			item.expected_time !== null &&
			item.expected_time !== undefined &&
			(!Number.isInteger(item.expected_time) || item.expected_time < 0)
		) {
			throw new Error("matching.expected_time must be a non-negative integer");
		}
	}

	const gameSkillListeningSpeaking = matchings[0]?.skill_listening_speaking ?? false;
	const gameSkillLangNature = matchings[0]?.skill_lang_nature ?? false;
	const gameSkillReading = matchings[0]?.skill_reading ?? false;
	const gameSkillWriting = matchings[0]?.skill_writing ?? false;
	const gameAudioQuestion = matchings[0]?.audio_question ?? false;
	const gameAudioChoice = matchings[0]?.audio_choice ?? false;
	const gameAudioAssistantVoice = matchings[0]?.audio_assistant_voice ?? false;
	const gameAudioBackground = matchings[0]?.audio_background ?? false;

	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const tableName = await resolveMatchingTableName(client);

		const gameRes = await client.query("SELECT id FROM game_info WHERE id = $1", [idGameInfo]);
		if (gameRes.rowCount === 0) throw new Error("game_info not found");

		const createdRows: any[] = [];
		for (const item of matchings) {
			const result = await client.query(
				`
				INSERT INTO ${tableName} (
					id_game_info,
					no,
					keyword,
					matching_word,
					hint,
					sound_keyword,
					image_keyword,
					sound_hint,
					image_hint,
					sound_matching_word,
					image_matching_word,
					skill_listening_speaking,
					skill_lang_nature,
					skill_reading,
					skill_writing,
					audio_question,
					audio_choice,
					audio_assistant_voice,
					audio_background,
					expected_time
				)
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
				RETURNING id, id_game_info, no, keyword, matching_word, hint, sound_keyword, image_keyword, sound_hint, image_hint, sound_matching_word, image_matching_word, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at
				`,
				[
					idGameInfo,
					item.no,
					item.keyword ?? null,
					item.matching_word ?? null,
					item.hint ?? null,
					item.sound_keyword ?? null,
					item.image_keyword ?? null,
					item.sound_hint ?? null,
					item.image_hint ?? null,
					item.sound_matching_word ?? null,
					item.image_matching_word ?? null,
					gameSkillListeningSpeaking,
					gameSkillLangNature,
					gameSkillReading,
					gameSkillWriting,
					gameAudioQuestion,
					gameAudioChoice,
					gameAudioAssistantVoice,
					gameAudioBackground,
					item.expected_time ?? 0
				]
			);

			createdRows.push(result.rows[0]);
		}

		await client.query("COMMIT");
		return createdRows;
	} catch (error: any) {
		await client.query("ROLLBACK");
		if (error?.code === "23505") {
			throw new Error("duplicate matching no for this game");
		}
		throw error;
	} finally {
		client.release();
	}
}

export async function getMatchingsByGameId(idGameInfo: number) {
	if (!Number.isInteger(idGameInfo) || idGameInfo <= 0) {
		throw new Error("id_game_info must be a positive integer");
	}

	const client = await pool.connect();
	try {
		const tableName = await resolveMatchingTableName(client);
		const result = await client.query(
			`
			SELECT id, id_game_info, no, keyword, matching_word, hint, sound_keyword, image_keyword, sound_hint, image_hint, sound_matching_word, image_matching_word, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
			FROM ${tableName}
			WHERE id_game_info = $1 AND delete_at IS NULL
			ORDER BY no ASC
			`,
			[idGameInfo]
		);

		return result.rows;
	} finally {
		client.release();
	}
}

export async function getAllMatchings() {
	const client = await pool.connect();
	try {
		const tableName = await resolveMatchingTableName(client);
		const result = await client.query(
			`
			SELECT id, id_game_info, no, keyword, matching_word, hint, sound_keyword, image_keyword, sound_hint, image_hint, sound_matching_word, image_matching_word, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
			FROM ${tableName}
			WHERE delete_at IS NULL
			ORDER BY id_game_info ASC, no ASC
			`
		);

		return result.rows;
	} finally {
		client.release();
	}
}

export async function updateMatchingById(matchingId: number, payload: UpdateMatchingInput) {
	if (!Number.isInteger(matchingId) || matchingId <= 0) {
		throw new Error("invalid matching id");
	}
	if (Object.prototype.hasOwnProperty.call(payload, "no") && !Number.isInteger(payload.no)) {
		throw new Error("no must be integer");
	}
	if (
		Object.prototype.hasOwnProperty.call(payload, "skill_listening_speaking") &&
		typeof payload.skill_listening_speaking !== "boolean"
	) {
		throw new Error("skill_listening_speaking must be boolean");
	}
	if (
		Object.prototype.hasOwnProperty.call(payload, "skill_lang_nature") &&
		typeof payload.skill_lang_nature !== "boolean"
	) {
		throw new Error("skill_lang_nature must be boolean");
	}
	if (Object.prototype.hasOwnProperty.call(payload, "skill_reading") && typeof payload.skill_reading !== "boolean") {
		throw new Error("skill_reading must be boolean");
	}
	if (Object.prototype.hasOwnProperty.call(payload, "skill_writing") && typeof payload.skill_writing !== "boolean") {
		throw new Error("skill_writing must be boolean");
	}
	if (Object.prototype.hasOwnProperty.call(payload, "audio_question") && typeof payload.audio_question !== "boolean") {
		throw new Error("audio_question must be boolean");
	}
	if (Object.prototype.hasOwnProperty.call(payload, "audio_choice") && typeof payload.audio_choice !== "boolean") {
		throw new Error("audio_choice must be boolean");
	}
	if (Object.prototype.hasOwnProperty.call(payload, "audio_assistant_voice") && typeof payload.audio_assistant_voice !== "boolean") {
		throw new Error("audio_assistant_voice must be boolean");
	}
	if (Object.prototype.hasOwnProperty.call(payload, "audio_background") && typeof payload.audio_background !== "boolean") {
		throw new Error("audio_background must be boolean");
	}
	if (
		Object.prototype.hasOwnProperty.call(payload, "expected_time") &&
		payload.expected_time !== null &&
		payload.expected_time !== undefined &&
		(!Number.isInteger(payload.expected_time) || payload.expected_time < 0)
	) {
		throw new Error("expected_time must be a non-negative integer");
	}

	const client = await pool.connect();
	try {
		await client.query("BEGIN");

		const tableName = await resolveMatchingTableName(client);
		const existing = await client.query(
			`SELECT id, id_game_info, no FROM ${tableName} WHERE id = $1 AND delete_at IS NULL FOR UPDATE`,
			[matchingId]
		);

		if (existing.rowCount === 0) throw new Error("matching not found");

		const currentMatching = existing.rows[0];
		if (Object.prototype.hasOwnProperty.call(payload, "no") && payload.no !== currentMatching.no) {
			const targetNo = payload.no as number;

			const conflict = await client.query(
				`SELECT id
				 FROM ${tableName}
				 WHERE id_game_info = $1 AND no = $2 AND delete_at IS NULL
				 FOR UPDATE`,
				[currentMatching.id_game_info, targetNo]
			);

			if ((conflict.rowCount ?? 0) > 0 && conflict.rows[0].id !== matchingId) {
				const tempNoRes = await client.query(
					`SELECT COALESCE(MIN(no), 0) - 1 AS temp_no
					 FROM ${tableName}
					 WHERE id_game_info = $1 AND delete_at IS NULL`,
					[currentMatching.id_game_info]
				);

				const tempNo = tempNoRes.rows[0].temp_no;
				await client.query(
					`UPDATE ${tableName}
					 SET no = $1, update_at = CURRENT_TIMESTAMP
					 WHERE id = $2`,
					[tempNo, conflict.rows[0].id]
				);

				await client.query(
					`UPDATE ${tableName}
					 SET no = $1, update_at = CURRENT_TIMESTAMP
					 WHERE id = $2`,
					[targetNo, matchingId]
				);

				await client.query(
					`UPDATE ${tableName}
					 SET no = $1, update_at = CURRENT_TIMESTAMP
					 WHERE id = $2`,
					[currentMatching.no, conflict.rows[0].id]
				);
			} else {
				await client.query(
					`UPDATE ${tableName}
					 SET no = $1, update_at = CURRENT_TIMESTAMP
					 WHERE id = $2`,
					[targetNo, matchingId]
				);
			}
		}

		const updates: string[] = [];
		const values: any[] = [];
		let idx = 1;

		if (Object.prototype.hasOwnProperty.call(payload, "keyword")) {
			updates.push(`keyword = $${idx++}`);
			values.push(payload.keyword ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "matching_word")) {
			updates.push(`matching_word = $${idx++}`);
			values.push(payload.matching_word ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "hint")) {
			updates.push(`hint = $${idx++}`);
			values.push(payload.hint ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "sound_keyword")) {
			updates.push(`sound_keyword = $${idx++}`);
			values.push(payload.sound_keyword ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "image_keyword")) {
			updates.push(`image_keyword = $${idx++}`);
			values.push(payload.image_keyword ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "sound_hint")) {
			updates.push(`sound_hint = $${idx++}`);
			values.push(payload.sound_hint ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "image_hint")) {
			updates.push(`image_hint = $${idx++}`);
			values.push(payload.image_hint ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "sound_matching_word")) {
			updates.push(`sound_matching_word = $${idx++}`);
			values.push(payload.sound_matching_word ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "image_matching_word")) {
			updates.push(`image_matching_word = $${idx++}`);
			values.push(payload.image_matching_word ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "skill_listening_speaking")) {
			updates.push(`skill_listening_speaking = $${idx++}`);
			values.push(payload.skill_listening_speaking);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "skill_lang_nature")) {
			updates.push(`skill_lang_nature = $${idx++}`);
			values.push(payload.skill_lang_nature);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "skill_reading")) {
			updates.push(`skill_reading = $${idx++}`);
			values.push(payload.skill_reading);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "skill_writing")) {
			updates.push(`skill_writing = $${idx++}`);
			values.push(payload.skill_writing);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "audio_question")) {
			updates.push(`audio_question = $${idx++}`);
			values.push(payload.audio_question);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "audio_choice")) {
			updates.push(`audio_choice = $${idx++}`);
			values.push(payload.audio_choice);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "audio_assistant_voice")) {
			updates.push(`audio_assistant_voice = $${idx++}`);
			values.push(payload.audio_assistant_voice);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "audio_background")) {
			updates.push(`audio_background = $${idx++}`);
			values.push(payload.audio_background);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "expected_time")) {
			updates.push(`expected_time = $${idx++}`);
			values.push(payload.expected_time ?? 0);
		}

		if (updates.length === 0 && !Object.prototype.hasOwnProperty.call(payload, "no")) {
			throw new Error("no updatable fields provided");
		}

		if (updates.length > 0) {
			const hasGameLevelSkillUpdate =
				Object.prototype.hasOwnProperty.call(payload, "skill_listening_speaking") ||
				Object.prototype.hasOwnProperty.call(payload, "skill_lang_nature") ||
				Object.prototype.hasOwnProperty.call(payload, "skill_reading") ||
				Object.prototype.hasOwnProperty.call(payload, "skill_writing");

			const hasAudioUpdate =
				Object.prototype.hasOwnProperty.call(payload, "audio_question") ||
				Object.prototype.hasOwnProperty.call(payload, "audio_choice") ||
				Object.prototype.hasOwnProperty.call(payload, "audio_assistant_voice") ||
				Object.prototype.hasOwnProperty.call(payload, "audio_background");

			if (hasGameLevelSkillUpdate || hasAudioUpdate) {
				const sql = `
				UPDATE ${tableName}
				SET ${updates.join(", ")}, update_at = CURRENT_TIMESTAMP
				WHERE id_game_info = $${idx} AND delete_at IS NULL
			`;
				values.push(currentMatching.id_game_info);
				await client.query(sql, values);
			} else {
				const sql = `
				UPDATE ${tableName}
				SET ${updates.join(", ")}, update_at = CURRENT_TIMESTAMP
				WHERE id = $${idx} AND delete_at IS NULL
			`;
				values.push(matchingId);
				await client.query(sql, values);
			}
		}

		const updated = await client.query(
			`SELECT id, id_game_info, no, keyword, matching_word, hint, sound_keyword, image_keyword, sound_hint, image_hint, sound_matching_word, image_matching_word, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
			 FROM ${tableName}
			 WHERE id = $1`,
			[matchingId]
		);

		await client.query("COMMIT");
		return updated.rows[0];
	} catch (error: any) {
		await client.query("ROLLBACK");
		if (error?.code === "23505") {
			throw new Error("duplicate matching no for this game");
		}
		throw error;
	} finally {
		client.release();
	}
}

export async function softDeleteMatchingById(matchingId: number) {
	if (!Number.isInteger(matchingId) || matchingId <= 0) {
		throw new Error("invalid matching id");
	}

	const client = await pool.connect();
	try {
		const tableName = await resolveMatchingTableName(client);
		const result = await client.query(
			`
			UPDATE ${tableName}
			SET delete_at = CURRENT_TIMESTAMP, update_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND delete_at IS NULL
			RETURNING id
			`,
			[matchingId]
		);

		if (result.rowCount === 0) throw new Error("matching not found");

		return { deleted: true };
	} finally {
		client.release();
	}
}

export async function hardDeleteMatchingById(matchingId: number) {
	if (!Number.isInteger(matchingId) || matchingId <= 0) {
		throw new Error("invalid matching id");
	}

	const client = await pool.connect();
	try {
		const tableName = await resolveMatchingTableName(client);
		const result = await client.query(
			`DELETE FROM ${tableName} WHERE id = $1 RETURNING id`,
			[matchingId]
		);

		if (result.rowCount === 0) throw new Error("matching not found");

		return { deleted: true };
	} finally {
		client.release();
	}
}

export async function hardDeleteMatchingMediaFieldById(matchingId: number, field: string) {
	if (!Number.isInteger(matchingId) || matchingId <= 0) {
		throw new Error("invalid matching id");
	}

	const targetField = toMatchingMediaField(field);

	const client = await pool.connect();
	try {
		const tableName = await resolveMatchingTableName(client);
		const result = await client.query(
			`
			UPDATE ${tableName}
			SET ${targetField} = NULL 
			WHERE id = $1 AND delete_at IS NULL
			RETURNING id, id_game_info, no, keyword, matching_word, hint, sound_keyword, image_keyword, sound_hint, image_hint, sound_matching_word, image_matching_word, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
			`,
			[matchingId]
		);

		if (result.rowCount === 0) throw new Error("matching not found");

		return { deleted_field: targetField, matching: result.rows[0] };
	} finally {
		client.release();
	}
}