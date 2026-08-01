import pool from "./db";

export interface CreateCorrectAnswerInput {
	no: number;
	correct_answer?: string | null;
	wrong_answer?: string | null;
	hint?: string | null;
	sound_correct_answer?: string | null;
	image_correct_answer?: string | null;
	sound_hint?: string | null;
	image_hint?: string | null;
	sound_wrong_answer?: string | null;
	image_wrong_answer?: string | null;
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

export interface UpdateCorrectAnswerInput {
	no?: number;
	correct_answer?: string | null;
	wrong_answer?: string | null;
	hint?: string | null;
	sound_correct_answer?: string | null;
	image_correct_answer?: string | null;
	sound_hint?: string | null;
	image_hint?: string | null;
	sound_wrong_answer?: string | null;
	image_wrong_answer?: string | null;
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

const ALLOWED_CORRECT_ANSWER_MEDIA_FIELDS = [
	"sound_correct_answer",
	"image_correct_answer",
	"sound_wrong_answer",
	"image_wrong_answer",
	"hint",
	"sound_hint",
	"image_hint"
] as const;

export type CorrectAnswerMediaField = (typeof ALLOWED_CORRECT_ANSWER_MEDIA_FIELDS)[number];

function toCorrectAnswerMediaField(field: string): CorrectAnswerMediaField {
	if ((ALLOWED_CORRECT_ANSWER_MEDIA_FIELDS as readonly string[]).includes(field)) {
		return field as CorrectAnswerMediaField;
	}

	throw new Error("invalid correct answer media field");
}

async function resolveCorrectAnswerTableName(client: any): Promise<string> {
	const result = await client.query(
		`SELECT
			COALESCE(to_regclass('public.correct_answer')::text, to_regclass('public.correct_answer_question')::text) AS table_name`
	);

	const tableName = result.rows?.[0]?.table_name;
	if (!tableName) {
		throw new Error("correct answer table not found");
	}

	return tableName;
}

export async function createCorrectAnswerByGameId(idGameInfo: number, correctAnswers: CreateCorrectAnswerInput[]) {
	if (!Number.isInteger(idGameInfo) || idGameInfo <= 0) {
		throw new Error("id_game_info must be a positive integer");
	}
	if (!Array.isArray(correctAnswers) || correctAnswers.length === 0) {
		throw new Error("correctAnswers must be a non-empty array");
	}

	const noSet = new Set<number>();
	for (const item of correctAnswers) {
		if (!Number.isInteger(item.no)) throw new Error("each correctAnswer.no must be integer");
		if (noSet.has(item.no)) throw new Error("duplicate correct answer no in the request");
		noSet.add(item.no);

		if (item.correct_answer !== undefined && item.correct_answer !== null && typeof item.correct_answer !== "string") {
			throw new Error("each correctAnswer.correct_answer must be a string");
		}
		if (item.wrong_answer !== undefined && item.wrong_answer !== null && typeof item.wrong_answer !== "string") {
			throw new Error("each correctAnswer.wrong_answer must be a string");
		}
		if (
			Object.prototype.hasOwnProperty.call(item, "skill_listening_speaking") &&
			typeof item.skill_listening_speaking !== "boolean"
		) {
			throw new Error("correctAnswer.skill_listening_speaking must be boolean");
		}
		if (
			Object.prototype.hasOwnProperty.call(item, "skill_lang_nature") &&
			typeof item.skill_lang_nature !== "boolean"
		) {
			throw new Error("correctAnswer.skill_lang_nature must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "skill_reading") && typeof item.skill_reading !== "boolean") {
			throw new Error("correctAnswer.skill_reading must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "skill_writing") && typeof item.skill_writing !== "boolean") {
			throw new Error("correctAnswer.skill_writing must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "audio_question") && typeof item.audio_question !== "boolean") {
			throw new Error("correctAnswer.audio_question must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "audio_choice") && typeof item.audio_choice !== "boolean") {
			throw new Error("correctAnswer.audio_choice must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "audio_assistant_voice") && typeof item.audio_assistant_voice !== "boolean") {
			throw new Error("correctAnswer.audio_assistant_voice must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "audio_background") && typeof item.audio_background !== "boolean") {
			throw new Error("correctAnswer.audio_background must be boolean");
		}
		if (
			Object.prototype.hasOwnProperty.call(item, "expected_time") &&
			item.expected_time !== null &&
			item.expected_time !== undefined &&
			(!Number.isInteger(item.expected_time) || item.expected_time < 0)
		) {
			throw new Error("correctAnswer.expected_time must be a non-negative integer");
		}
	}

	const gameSkillListeningSpeaking = correctAnswers[0]?.skill_listening_speaking ?? false;
	const gameSkillLangNature = correctAnswers[0]?.skill_lang_nature ?? false;
	const gameSkillReading = correctAnswers[0]?.skill_reading ?? false;
	const gameSkillWriting = correctAnswers[0]?.skill_writing ?? false;
	const gameAudioQuestion = correctAnswers[0]?.audio_question ?? false;
	const gameAudioChoice = correctAnswers[0]?.audio_choice ?? false;
	const gameAudioAssistantVoice = correctAnswers[0]?.audio_assistant_voice ?? false;
	const gameAudioBackground = correctAnswers[0]?.audio_background ?? false;

	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const tableName = await resolveCorrectAnswerTableName(client);

		const gameRes = await client.query("SELECT id FROM game_info WHERE id = $1", [idGameInfo]);
		if (gameRes.rowCount === 0) throw new Error("game_info not found");

		const createdRows: any[] = [];
		for (const item of correctAnswers) {
			const result = await client.query(
				`
				INSERT INTO ${tableName} (
					id_game_info,
					no,
					correct_answer,
					wrong_answer,
					hint,
					sound_correct_answer,
					image_correct_answer,
					sound_wrong_answer,
					image_wrong_answer,
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
					VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
				RETURNING id, id_game_info, no, correct_answer, wrong_answer, hint, sound_correct_answer, image_correct_answer, sound_wrong_answer, image_wrong_answer, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at
				`,
				[
					idGameInfo,
					item.no,
					item.correct_answer ?? null,
					item.wrong_answer ?? null,
					item.hint ?? null,
					item.sound_correct_answer ?? null,
					item.image_correct_answer ?? null,
					item.sound_wrong_answer ?? null,
					item.image_wrong_answer ?? null,
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
			throw new Error("duplicate correctAnswer.no for this game");
		}
		throw error;
	} finally {
		client.release();
	}
}

export async function getCorrectAnswersByGameId(idGameInfo: number) {
	if (!Number.isInteger(idGameInfo) || idGameInfo <= 0) {
		throw new Error("id_game_info must be a positive integer");
	}

	const client = await pool.connect();
	try {
		const tableName = await resolveCorrectAnswerTableName(client);
		const result = await client.query(
			`
			SELECT id, id_game_info, no, correct_answer, wrong_answer, hint, sound_correct_answer, image_correct_answer, sound_wrong_answer, image_wrong_answer, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
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

export async function getAllCorrectAnswers() {
	const client = await pool.connect();
	try {
		const tableName = await resolveCorrectAnswerTableName(client);
		const result = await client.query(
			`
			SELECT id, id_game_info, no, correct_answer, wrong_answer, hint, sound_correct_answer, image_correct_answer, sound_wrong_answer, image_wrong_answer, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
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

export async function updateCorrectAnswerById(correctAnswerId: number, payload: UpdateCorrectAnswerInput) {
	if (!Number.isInteger(correctAnswerId) || correctAnswerId <= 0) {
		throw new Error("invalid correctAnswer id");
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

		const tableName = await resolveCorrectAnswerTableName(client);
		const existing = await client.query(
			`SELECT id, id_game_info, no FROM ${tableName} WHERE id = $1 AND delete_at IS NULL FOR UPDATE`,
			[correctAnswerId]
		);

		if (existing.rowCount === 0) throw new Error("correctAnswer not found");

		const currentCorrectAnswer = existing.rows[0];
		if (Object.prototype.hasOwnProperty.call(payload, "no") && payload.no !== currentCorrectAnswer.no) {
			const targetNo = payload.no as number;

			const conflict = await client.query(
				`SELECT id
				 FROM ${tableName}
				 WHERE id_game_info = $1 AND no = $2 AND delete_at IS NULL
				 FOR UPDATE`,
				[currentCorrectAnswer.id_game_info, targetNo]
			);

			if ((conflict.rowCount ?? 0) > 0 && conflict.rows[0].id !== correctAnswerId) {
				const tempNoRes = await client.query(
					`SELECT COALESCE(MIN(no), 0) - 1 AS temp_no
					 FROM ${tableName}
					 WHERE id_game_info = $1 AND delete_at IS NULL`,
					[currentCorrectAnswer.id_game_info]
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
					[targetNo, correctAnswerId]
				);

				await client.query(
					`UPDATE ${tableName}
					 SET no = $1, update_at = CURRENT_TIMESTAMP
					 WHERE id = $2`,
					[currentCorrectAnswer.no, conflict.rows[0].id]
				);
			} else {
				await client.query(
					`UPDATE ${tableName}
					 SET no = $1, update_at = CURRENT_TIMESTAMP
					 WHERE id = $2`,
					[targetNo, correctAnswerId]
				);
			}
		}

		const updates: string[] = [];
		const values: any[] = [];
		let idx = 1;

		if (Object.prototype.hasOwnProperty.call(payload, "correct_answer")) {
			updates.push(`correct_answer = $${idx++}`);
			values.push(payload.correct_answer ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "wrong_answer")) {
			updates.push(`wrong_answer = $${idx++}`);
			values.push(payload.wrong_answer ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "hint")) {
			updates.push(`hint = $${idx++}`);
			values.push(payload.hint ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "sound_correct_answer")) {
			updates.push(`sound_correct_answer = $${idx++}`);
			values.push(payload.sound_correct_answer ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "image_correct_answer")) {
			updates.push(`image_correct_answer = $${idx++}`);
			values.push(payload.image_correct_answer ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "sound_hint")) {
			updates.push(`sound_hint = $${idx++}`);
			values.push(payload.sound_hint ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "image_hint")) {
			updates.push(`image_hint = $${idx++}`);
			values.push(payload.image_hint ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "sound_wrong_answer")) {
			updates.push(`sound_wrong_answer = $${idx++}`);
			values.push(payload.sound_wrong_answer ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "image_wrong_answer")) {
			updates.push(`image_wrong_answer = $${idx++}`);
			values.push(payload.image_wrong_answer ?? null);
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
				values.push(currentCorrectAnswer.id_game_info);
				await client.query(sql, values);
			} else {
				const sql = `
				UPDATE ${tableName}
				SET ${updates.join(", ")}, update_at = CURRENT_TIMESTAMP
				WHERE id = $${idx} AND delete_at IS NULL
			`;
				values.push(correctAnswerId);
				await client.query(sql, values);
			}
		}

		const updated = await client.query(
			`SELECT id, id_game_info, no, correct_answer, wrong_answer, hint, sound_correct_answer, image_correct_answer, sound_hint, image_hint, sound_wrong_answer, image_wrong_answer, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
			 FROM ${tableName}
			 WHERE id = $1`,
			[correctAnswerId]
		);

		await client.query("COMMIT");
		return updated.rows[0];
	} catch (error: any) {
		await client.query("ROLLBACK");
		if (error?.code === "23505") {
			throw new Error("duplicate correct answer no for this game");
		}
		throw error;
	} finally {
		client.release();
	}
}

export async function softDeleteCorrectAnswerById(correctAnswerId: number) {
	if (!Number.isInteger(correctAnswerId) || correctAnswerId <= 0) {
		throw new Error("invalid correct answer id");
	}

	const client = await pool.connect();
	try {
		const tableName = await resolveCorrectAnswerTableName(client);
		const result = await client.query(
			`
			UPDATE ${tableName}
			SET delete_at = CURRENT_TIMESTAMP, update_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND delete_at IS NULL
			RETURNING id
			`,
			[correctAnswerId]
		);

		if (result.rowCount === 0) throw new Error("correct answer not found");

		return { deleted: true };
	} finally {
		client.release();
	}
}

export async function hardDeleteCorrectAnswerById(correctAnswerId: number) {
	if (!Number.isInteger(correctAnswerId) || correctAnswerId <= 0) {
		throw new Error("invalid correct answer id");
	}

	const client = await pool.connect();
	try {
		const tableName = await resolveCorrectAnswerTableName(client);
		const result = await client.query(
			`DELETE FROM ${tableName} WHERE id = $1 RETURNING id`,
			[correctAnswerId]
		);

		if (result.rowCount === 0) throw new Error("correct answer not found");

		return { deleted: true };
	} finally {
		client.release();
	}
}

export async function hardDeleteCorrectAnswerMediaFieldById(correctAnswerId: number, field: string) {
	if (!Number.isInteger(correctAnswerId) || correctAnswerId <= 0) {
		throw new Error("invalid correct answer id");
	}

	const targetField = toCorrectAnswerMediaField(field);

	const client = await pool.connect();
	try {
		const tableName = await resolveCorrectAnswerTableName(client);
		const result = await client.query(
			`
			UPDATE ${tableName}
			SET ${targetField} = NULL 
			WHERE id = $1 AND delete_at IS NULL
			RETURNING id, id_game_info, no, correct_answer, wrong_answer, hint, sound_correct_answer, image_correct_answer, sound_hint, image_hint, sound_wrong_answer, image_wrong_answer, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
			`,
			[correctAnswerId]
		);

		if (result.rowCount === 0) throw new Error("correct answer not found");

		return { deleted_field: targetField, correct_answer: result.rows[0] };
	} finally {
		client.release();
	}
}