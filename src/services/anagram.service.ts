import pool from "./db";

export interface CreateAnagramInput {
	no: number;
	word?: string | null;
	swap_word?: string[] | null;
	hint?: string | null;
	sound_word?: string | null;
	image_word?: string | null;
	sound_hint?: string | null;
	image_hint?: string | null;
	sound_swap_word?: string | null;
	image_swap_word?: string | null;
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

export interface UpdateAnagramInput {
	no?: number;
	word?: string | null;
	swap_word?: string[] | null;
	hint?: string | null;
	sound_word?: string | null;
	image_word?: string | null;
	sound_hint?: string | null;
	image_hint?: string | null;
	sound_swap_word?: string | null;
	image_swap_word?: string | null;
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

const ALLOWED_ANAGRAM_MEDIA_FIELDS = [
	"sound_word",
	"sound_swap_word",
	"image_word",
	"image_swap_word",
	"hint",
	"sound_hint",
	"image_hint"
] as const;

export type AnagramMediaField = (typeof ALLOWED_ANAGRAM_MEDIA_FIELDS)[number];

function toAnagramMediaField(field: string): AnagramMediaField {
	if ((ALLOWED_ANAGRAM_MEDIA_FIELDS as readonly string[]).includes(field)) {
		return field as AnagramMediaField;
	}

	throw new Error("invalid anagram media field");
}

async function resolveAnagramTableName(client: any): Promise<string> {
	const result = await client.query(
		`SELECT
			COALESCE(to_regclass('public.anagram')::text, to_regclass('public.anagram_question')::text) AS table_name`
	);

	const tableName = result.rows?.[0]?.table_name;
	if (!tableName) {
		throw new Error("anagram table not found");
	}

	return tableName;
}

export async function createAnagramByGameId(idGameInfo: number, anagrams: CreateAnagramInput[]) {
	if (!Number.isInteger(idGameInfo) || idGameInfo <= 0) {
		throw new Error("id_game_info must be a positive integer");
	}
	if (!Array.isArray(anagrams) || anagrams.length === 0) {
		throw new Error("anagrams must be a non-empty array");
	}

	const noSet = new Set<number>();
	for (const item of anagrams) {
		if (!Number.isInteger(item.no)) throw new Error("each anagram.no must be integer");
		if (noSet.has(item.no)) throw new Error("anagram no must be unique in the request");
		noSet.add(item.no);

		if (item.word !== undefined && item.word !== null && typeof item.word !== "string") {
			throw new Error("each anagram.word must be a string or null");
		}
		if (item.swap_word !== undefined && item.swap_word !== null && !Array.isArray(item.swap_word)) {
			throw new Error("each anagram.swap_word must be a array");
		}
		if (
			Object.prototype.hasOwnProperty.call(item, "skill_listening_speaking") &&
			typeof item.skill_listening_speaking !== "boolean"
		) {
			throw new Error("anagram.skill_listening_speaking must be boolean");
		}
		if (
			Object.prototype.hasOwnProperty.call(item, "skill_lang_nature") &&
			typeof item.skill_lang_nature !== "boolean"
		) {
			throw new Error("anagram.skill_lang_nature must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "skill_reading") && typeof item.skill_reading !== "boolean") {
			throw new Error("anagram.skill_reading must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "skill_writing") && typeof item.skill_writing !== "boolean") {
			throw new Error("anagram.skill_writing must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "audio_question") && typeof item.audio_question !== "boolean") {
			throw new Error("anagram.audio_question must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "audio_choice") && typeof item.audio_choice !== "boolean") {
			throw new Error("anagram.audio_choice must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "audio_assistant_voice") && typeof item.audio_assistant_voice !== "boolean") {
			throw new Error("anagram.audio_assistant_voice must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "audio_background") && typeof item.audio_background !== "boolean") {
			throw new Error("anagram.audio_background must be boolean");
		}
		if (
			Object.prototype.hasOwnProperty.call(item, "expected_time") &&
			item.expected_time !== null &&
			item.expected_time !== undefined &&
			(!Number.isInteger(item.expected_time) || item.expected_time < 0)
		) {
			throw new Error("anagram.expected_time must be a non-negative integer");
		}
	}

	const gameSkillListeningSpeaking = anagrams[0]?.skill_listening_speaking ?? false;
	const gameSkillLangNature = anagrams[0]?.skill_lang_nature ?? false;
	const gameSkillReading = anagrams[0]?.skill_reading ?? false;
	const gameSkillWriting = anagrams[0]?.skill_writing ?? false;
	const gameAudioQuestion = anagrams[0]?.audio_question ?? false;
	const gameAudioChoice = anagrams[0]?.audio_choice ?? false;
	const gameAudioAssistantVoice = anagrams[0]?.audio_assistant_voice ?? false;
	const gameAudioBackground = anagrams[0]?.audio_background ?? false;

	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const tableName = await resolveAnagramTableName(client);

		const gameRes = await client.query("SELECT id FROM game_info WHERE id = $1", [idGameInfo]);
		if (gameRes.rowCount === 0) throw new Error("game_info not found");

		const createdRows: any[] = [];
		for (const item of anagrams) {
			const result = await client.query(
				`
				INSERT INTO ${tableName} (
					id_game_info,
					no,
					word,
					swap_word,
					hint,
					sound_word,
					image_word,
					sound_hint,
					image_hint,
					sound_swap_word,
					image_swap_word,
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
				VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
				RETURNING id, id_game_info, no, word, swap_word, hint, sound_word, image_word, sound_hint, image_hint, sound_swap_word, image_swap_word, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at
				`,
				[
					idGameInfo,
					item.no,
					item.word == null ? null : item.word,
					item.swap_word == null ? null : JSON.stringify(item.swap_word),
					item.hint ?? null,
					item.sound_word ?? null,
					item.image_word ?? null,
					item.sound_hint ?? null,
					item.image_hint ?? null,
					item.sound_swap_word ?? null,
					item.image_swap_word ?? null,
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
			throw new Error("duplicate anagram no for this game");
		}
		throw error;
	} finally {
		client.release();
	}
}

export async function getAnagramsByGameId(idGameInfo: number) {
	if (!Number.isInteger(idGameInfo) || idGameInfo <= 0) {
		throw new Error("id_game_info must be a positive integer");
	}

	const client = await pool.connect();
	try {
		const tableName = await resolveAnagramTableName(client);
		const result = await client.query(
			`
			SELECT id, id_game_info, no, word, swap_word, hint, sound_word, image_word, sound_hint, image_hint, sound_swap_word, image_swap_word, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
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

export async function getAllAnagrams() {
	const client = await pool.connect();
	try {
		const tableName = await resolveAnagramTableName(client);
		const result = await client.query(
			`
			SELECT id, id_game_info, no, word, swap_word, hint, sound_word, image_word, sound_hint, image_hint, sound_swap_word, image_swap_word, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
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

export async function updateAnagramById(anagramId: number, payload: UpdateAnagramInput) {
	if (!Number.isInteger(anagramId) || anagramId <= 0) {
		throw new Error("invalid anagram id");
	}
	if (Object.prototype.hasOwnProperty.call(payload, "no") && !Number.isInteger(payload.no)) {
		throw new Error("no must be integer");
	}
	if (Object.prototype.hasOwnProperty.call(payload, "word") && payload.word !== null && typeof payload.word !== "string") {
		throw new Error("each anagram.word must be a string or null");
	}

	if (payload.swap_word !== undefined && payload.swap_word !== null && !Array.isArray(payload.swap_word)) {
		throw new Error("each anagram.swap_word must be a array");
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

		const tableName = await resolveAnagramTableName(client);
		const existing = await client.query(
			`SELECT id, id_game_info, no FROM ${tableName} WHERE id = $1 AND delete_at IS NULL FOR UPDATE`,
			[anagramId]
		);

		if (existing.rowCount === 0) throw new Error("anagram not found");

		const currentAnagram = existing.rows[0];
		if (Object.prototype.hasOwnProperty.call(payload, "no") && payload.no !== currentAnagram.no) {
			const targetNo = payload.no as number;

			const conflict = await client.query(
				`SELECT id
				 FROM ${tableName}
				 WHERE id_game_info = $1 AND no = $2 AND delete_at IS NULL
				 FOR UPDATE`,
				[currentAnagram.id_game_info, targetNo]
			);

			if ((conflict.rowCount ?? 0) > 0 && conflict.rows[0].id !== anagramId) {
				const tempNoRes = await client.query(
					`SELECT COALESCE(MIN(no), 0) - 1 AS temp_no
					 FROM ${tableName}
					 WHERE id_game_info = $1 AND delete_at IS NULL`,
					[currentAnagram.id_game_info]
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
					[targetNo, anagramId]
				);

				await client.query(
					`UPDATE ${tableName}
					 SET no = $1, update_at = CURRENT_TIMESTAMP
					 WHERE id = $2`,
					[currentAnagram.no, conflict.rows[0].id]
				);
			} else {
				await client.query(
					`UPDATE ${tableName}
					 SET no = $1, update_at = CURRENT_TIMESTAMP
					 WHERE id = $2`,
					[targetNo, anagramId]
				);
			}
		}

		const updates: string[] = [];
		const values: any[] = [];
		let idx = 1;

		if (Object.prototype.hasOwnProperty.call(payload, "word")) {
			updates.push(`word = $${idx++}`);
			values.push(payload.word ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "swap_word")) {
			updates.push(`swap_word = $${idx++}::jsonb`);
			values.push(payload.swap_word == null ? null : JSON.stringify(payload.swap_word));
		}
		if (Object.prototype.hasOwnProperty.call(payload, "hint")) {
			updates.push(`hint = $${idx++}`);
			values.push(payload.hint ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "sound_word")) {
			updates.push(`sound_word = $${idx++}`);
			values.push(payload.sound_word ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "image_word")) {
			updates.push(`image_word = $${idx++}`);
			values.push(payload.image_word ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "sound_hint")) {
			updates.push(`sound_hint = $${idx++}`);
			values.push(payload.sound_hint ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "image_hint")) {
			updates.push(`image_hint = $${idx++}`);
			values.push(payload.image_hint ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "sound_swap_word")) {
			updates.push(`sound_swap_word = $${idx++}`);
			values.push(payload.sound_swap_word ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "image_swap_word")) {
			updates.push(`image_swap_word = $${idx++}`);
			values.push(payload.image_swap_word ?? null);
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

			const hasGameLevelAudioUpdate =
				Object.prototype.hasOwnProperty.call(payload, "audio_question") ||
				Object.prototype.hasOwnProperty.call(payload, "audio_choice") ||
				Object.prototype.hasOwnProperty.call(payload, "audio_assistant_voice") ||
				Object.prototype.hasOwnProperty.call(payload, "audio_background");

			if (hasGameLevelSkillUpdate || hasGameLevelAudioUpdate) {
				const sql = `
				UPDATE ${tableName}
				SET ${updates.join(", ")}, update_at = CURRENT_TIMESTAMP
				WHERE id_game_info = $${idx} AND delete_at IS NULL
			`;
				values.push(currentAnagram.id_game_info);
				await client.query(sql, values);
			} else {
				const sql = `
				UPDATE ${tableName}
				SET ${updates.join(", ")}, update_at = CURRENT_TIMESTAMP
				WHERE id = $${idx} AND delete_at IS NULL
			`;
				values.push(anagramId);
				await client.query(sql, values);
			}
		}

		const updated = await client.query(
			`SELECT id, id_game_info, no, word, swap_word, hint, sound_word, image_word, sound_hint, image_hint, sound_swap_word, image_swap_word, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
			 FROM ${tableName}
			 WHERE id = $1`,
			[anagramId]
		);

		await client.query("COMMIT");
		return updated.rows[0];
	} catch (error: any) {
		await client.query("ROLLBACK");
		if (error?.code === "23505") {
			throw new Error("duplicate anagram no for this game");
		}
		throw error;
	} finally {
		client.release();
	}
}

export async function softDeleteAnagramById(anagramId: number) {
	if (!Number.isInteger(anagramId) || anagramId <= 0) {
		throw new Error("invalid anagram id");
	}

	const client = await pool.connect();
	try {
		const tableName = await resolveAnagramTableName(client);
		const result = await client.query(
			`
			UPDATE ${tableName}
			SET delete_at = CURRENT_TIMESTAMP, update_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND delete_at IS NULL
			RETURNING id
			`,
			[anagramId]
		);

		if (result.rowCount === 0) throw new Error("anagram not found");

		return { deleted: true };
	} finally {
		client.release();
	}
}

export async function hardDeleteAnagramById(anagramId: number) {
	if (!Number.isInteger(anagramId) || anagramId <= 0) {
		throw new Error("invalid anagram id");
	}

	const client = await pool.connect();
	try {
		const tableName = await resolveAnagramTableName(client);
		const result = await client.query(
			`DELETE FROM ${tableName} WHERE id = $1 RETURNING id`,
			[anagramId]
		);

		if (result.rowCount === 0) throw new Error("anagram not found");

		return { deleted: true };
	} finally {
		client.release();
	}
}

export async function hardDeleteAnagramMediaFieldById(anagramId: number, field: string) {
	if (!Number.isInteger(anagramId) || anagramId <= 0) {
		throw new Error("invalid anagram id");
	}

	const targetField = toAnagramMediaField(field);

	const client = await pool.connect();
	try {
		const tableName = await resolveAnagramTableName(client);
		const result = await client.query(
			`
			UPDATE ${tableName}
			SET ${targetField} = NULL 
			WHERE id = $1 AND delete_at IS NULL
			RETURNING id, id_game_info, no, word, swap_word, hint, sound_word, image_word, sound_hint, image_hint, sound_swap_word, image_swap_word, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
			`,
			[anagramId]
		);

		if (result.rowCount === 0) throw new Error("anagram not found");

		return { deleted_field: targetField, anagram: result.rows[0] };
	} finally {
		client.release();
	}
}
