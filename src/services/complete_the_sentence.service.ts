import pool from "./db";

export interface CompleteTheSentenceQuestionWordItem {
	word: string;
	word_sound?: string | null;
	answer: string | null;
	answer_sound?: string | null;
	answer_image?: string | null;
}

export interface CompleteTheSentenceQuestionWrongAnswerGroupItem {
	wrong_answer: CompleteTheSentenceWrongAnswerItem[];
}

export interface CompleteTheSentenceWrongAnswerItem {
	text?: string | null;
	sound?: string | null;
	image?: string | null;
}

export type CompleteTheSentenceQuestionAnswerItem =
	| CompleteTheSentenceQuestionWordItem
	| CompleteTheSentenceQuestionWrongAnswerGroupItem;

type CompleteTheSentenceQuestionAnswerInput =
	| CompleteTheSentenceQuestionAnswerItem[]
	| string
	| null;

type CompleteTheSentenceSchema = {
	tableName: string;
	soundQuestionColumn: string;
	imageQuestionColumn: string;
};

export interface CreateCompleteTheSentenceInput {
	no: number;
	question_answer?: CompleteTheSentenceQuestionAnswerInput;
	hint?: string | null;
	sound_question_answer?: string | null;
	image_question_answer?: string | null;
	sound_hint?: string | null;
	image_hint?: string | null;
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

export interface UpdateCompleteTheSentenceInput {
	no?: number;
	question_answer?: CompleteTheSentenceQuestionAnswerInput;
	hint?: string | null;
	sound_question_answer?: string | null;
	image_question_answer?: string | null;
	sound_hint?: string | null;
	image_hint?: string | null;
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

const ALLOWED_COMPLETE_THE_SENTENCE_MEDIA_FIELDS = [
	"sound_question",
	"image_question",
	"hint",
	"sound_hint",
	"image_hint"
] as const;

export type CompleteTheSentenceMediaField = (typeof ALLOWED_COMPLETE_THE_SENTENCE_MEDIA_FIELDS)[number];

function toCompleteTheSentenceMediaField(field: string): CompleteTheSentenceMediaField {
	if ((ALLOWED_COMPLETE_THE_SENTENCE_MEDIA_FIELDS as readonly string[]).includes(field)) {
		return field as CompleteTheSentenceMediaField;
	}

	throw new Error("invalid complete the sentence media field");
}

function normalizeQuestionAnswerItems(
	items: any,
	fieldName: string
): CompleteTheSentenceQuestionAnswerItem[] {
	if (!Array.isArray(items)) {
		throw new Error(`${fieldName} must be an array`);
	}

	const normalizeWrongAnswers = (
		wrongAnswerItems: any,
		currentFieldName: string
	): CompleteTheSentenceWrongAnswerItem[] => {
		if (!Array.isArray(wrongAnswerItems)) {
			throw new Error(`${currentFieldName} must be an array`);
		}

		if (wrongAnswerItems.length === 0) {
			throw new Error(`${currentFieldName} must not be empty`);
		}

		return wrongAnswerItems.map((wrongAnswer, wrongAnswerIndex) => {
			if (!wrongAnswer || typeof wrongAnswer !== "object" || Array.isArray(wrongAnswer)) {
				throw new Error(
					`${currentFieldName}[${wrongAnswerIndex}] must be an object with text/sound/image`
				);
			}

			if (
				wrongAnswer.text !== null &&
				wrongAnswer.text !== undefined &&
				typeof wrongAnswer.text !== "string"
			) {
				throw new Error(
					`${currentFieldName}[${wrongAnswerIndex}].text must be a string or null`
				);
			}

			if (
				wrongAnswer.sound !== null &&
				wrongAnswer.sound !== undefined &&
				typeof wrongAnswer.sound !== "string"
			) {
				throw new Error(
					`${currentFieldName}[${wrongAnswerIndex}].sound must be a string or null`
				);
			}

			if (
				wrongAnswer.image !== null &&
				wrongAnswer.image !== undefined &&
				typeof wrongAnswer.image !== "string"
			) {
				throw new Error(
					`${currentFieldName}[${wrongAnswerIndex}].image must be a string or null`
				);
			}

			if (
				(wrongAnswer.text === null || wrongAnswer.text === undefined || wrongAnswer.text === "") &&
				(wrongAnswer.sound === null || wrongAnswer.sound === undefined || wrongAnswer.sound === "") &&
				(wrongAnswer.image === null || wrongAnswer.image === undefined || wrongAnswer.image === "")
			) {
				throw new Error(
					`${currentFieldName}[${wrongAnswerIndex}] must contain text, sound, or image`
				);
			}

			return {
				text: wrongAnswer.text ?? null,
				sound: wrongAnswer.sound ?? null,
				image: wrongAnswer.image ?? null,
			};
		});
	};

	return items.map((item, index) => {
		if (!item || typeof item !== "object" || Array.isArray(item)) {
			throw new Error(`${fieldName}[${index}] must be an object`);
		}

		const hasWordField = Object.prototype.hasOwnProperty.call(item, "word");
		const hasWrongAnswerField = Object.prototype.hasOwnProperty.call(item, "wrong_answer");
		const hasAnyWordGroupField =
			hasWordField ||
			Object.prototype.hasOwnProperty.call(item, "answer") ||
			Object.prototype.hasOwnProperty.call(item, "word_sound") ||
			Object.prototype.hasOwnProperty.call(item, "answer_sound") ||
			Object.prototype.hasOwnProperty.call(item, "answer_image");

		if (hasWrongAnswerField && !hasAnyWordGroupField) {
			if (item.wrong_answer === null || item.wrong_answer === undefined) {
				throw new Error(`${fieldName}[${index}].wrong_answer must be a non-empty array`);
			}

			return {
				wrong_answer: normalizeWrongAnswers(item.wrong_answer, `${fieldName}[${index}].wrong_answer`),
			};
		}

		if (!hasWordField) {
			throw new Error(
				`${fieldName}[${index}] must be either a word/answer item or a wrong_answer group item`
			);
		}

		if (typeof item.word !== "string") {
			throw new Error(`${fieldName}[${index}].word must be a string`);
		}

		if (item.answer !== null && item.answer !== undefined && typeof item.answer !== "string") {
			throw new Error(`${fieldName}[${index}].answer must be a string or null`);
		}

		if (item.word_sound !== null && item.word_sound !== undefined && typeof item.word_sound !== "string") {
			throw new Error(`${fieldName}[${index}].word_sound must be a string or null`);
		}

		if (item.answer_sound !== null && item.answer_sound !== undefined && typeof item.answer_sound !== "string") {
			throw new Error(`${fieldName}[${index}].answer_sound must be a string or null`);
		}

		if (item.answer_image !== null && item.answer_image !== undefined && typeof item.answer_image !== "string") {
			throw new Error(`${fieldName}[${index}].answer_image must be a string or null`);
		}

		if (hasWrongAnswerField && item.wrong_answer !== null && item.wrong_answer !== undefined) {
			throw new Error(
				`${fieldName}[${index}].wrong_answer must be omitted for word/answer items`
			);
		}

		return {
			word: item.word,
			word_sound: item.word_sound ?? null,
			answer: item.answer ?? null,
			answer_sound: item.answer_sound ?? null,
			answer_image: item.answer_image ?? null,
		};
	});
}

function serializeQuestionAnswerForDb(
	value: CompleteTheSentenceQuestionAnswerInput | undefined,
	fieldName: string
): string | null | undefined {
	if (value === undefined) return undefined;
	if (value === null) return null;

	if (Array.isArray(value)) {
		return JSON.stringify(normalizeQuestionAnswerItems(value, fieldName));
	}

	if (typeof value !== "string") {
		throw new Error(`${fieldName} must be an array, JSON string, or null`);
	}

	const trimmed = value.trim();
	if (!trimmed) {
		throw new Error(`${fieldName} must not be empty`);
	}

	let parsed: any;
	try {
		parsed = JSON.parse(trimmed);
	} catch {
		throw new Error(`${fieldName} must be a valid JSON array`);
	}

	return JSON.stringify(normalizeQuestionAnswerItems(parsed, fieldName));
}

function parseQuestionAnswerFromDb(value: any): CompleteTheSentenceQuestionAnswerItem[] | string | null {
	if (value === null || value === undefined) {
		return null;
	}

	if (typeof value !== "string") {
		return value;
	}

	const trimmed = value.trim();
	if (!trimmed) {
		return value;
	}

	try {
		const parsed = JSON.parse(trimmed);
		return normalizeQuestionAnswerItems(parsed, "question_answer");
	} catch {
		return value;
	}
}

function mapQuestionAnswerField(row: any) {
	return {
		...row,
		question_answer: parseQuestionAnswerFromDb(row.question_answer),
	};
}

async function resolveCompleteTheSentenceSchema(client: any): Promise<CompleteTheSentenceSchema> {
	const result = await client.query(
		`SELECT
			COALESCE(to_regclass('public.complete_the_sentence')::text, to_regclass('public.complete_the_sentence_question')::text) AS table_name`
	);

	const tableName = result.rows?.[0]?.table_name;
	if (!tableName) {
		throw new Error("complete_the_sentence table not found");
	}

	const columnsRes = await client.query(
		`
		SELECT column_name
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = $1
		  AND column_name IN ('sound_question_answer', 'sound_question', 'image_question_answer', 'image_question')
		`,
		[tableName.replace("public.", "")]
	);

	const columns = new Set<string>(columnsRes.rows.map((row: any) => row.column_name));
	const soundQuestionColumn = columns.has("sound_question_answer")
		? "sound_question_answer"
		: columns.has("sound_question")
			? "sound_question"
			: "";
	const imageQuestionColumn = columns.has("image_question_answer")
		? "image_question_answer"
		: columns.has("image_question")
			? "image_question"
			: "";

	if (!soundQuestionColumn || !imageQuestionColumn) {
		throw new Error("complete_the_sentence media columns not found");
	}

	return {
		tableName,
		soundQuestionColumn,
		imageQuestionColumn,
	};
}

export async function createCompleteTheSentenceByGameId(idGameInfo: number, completeTheSentences: CreateCompleteTheSentenceInput[]) {
	if (!Number.isInteger(idGameInfo) || idGameInfo <= 0) {
		throw new Error("id_game_info must be a positive integer");
	}
	if (!Array.isArray(completeTheSentences) || completeTheSentences.length === 0) {
		throw new Error("completeTheSentences must be a non-empty array");
	}

	const noSet = new Set<number>();
	for (const item of completeTheSentences) {
		if (!Number.isInteger(item.no)) throw new Error("each completeTheSentence.no must be integer");
		if (noSet.has(item.no)) throw new Error("completeTheSentence no must be unique in the request");
		noSet.add(item.no);

		if (Object.prototype.hasOwnProperty.call(item, "question_answer")) {
			serializeQuestionAnswerForDb(item.question_answer, "each completeTheSentence.question_answer");
		}
		if (item.hint !== undefined && item.hint !== null && typeof item.hint !== "string") {
			throw new Error("each completeTheSentence.hint must be a string");
		}
		if (
			Object.prototype.hasOwnProperty.call(item, "skill_listening_speaking") &&
			typeof item.skill_listening_speaking !== "boolean"
		) {
			throw new Error("completeTheSentence.skill_listening_speaking must be boolean");
		}
		if (
			Object.prototype.hasOwnProperty.call(item, "skill_lang_nature") &&
			typeof item.skill_lang_nature !== "boolean"
		) {
			throw new Error("completeTheSentence.skill_lang_nature must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "skill_reading") && typeof item.skill_reading !== "boolean") {
			throw new Error("completeTheSentence.skill_reading must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "skill_writing") && typeof item.skill_writing !== "boolean") {
			throw new Error("completeTheSentence.skill_writing must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "audio_question") && typeof item.audio_question !== "boolean") {
			throw new Error("completeTheSentence.audio_question must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "audio_choice") && typeof item.audio_choice !== "boolean") {
			throw new Error("completeTheSentence.audio_choice must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "audio_assistant_voice") && typeof item.audio_assistant_voice !== "boolean") {
			throw new Error("completeTheSentence.audio_assistant_voice must be boolean");
		}
		if (Object.prototype.hasOwnProperty.call(item, "audio_background") && typeof item.audio_background !== "boolean") {
			throw new Error("completeTheSentence.audio_background must be boolean");
		}
		if (
			Object.prototype.hasOwnProperty.call(item, "expected_time") &&
			item.expected_time !== null &&
			item.expected_time !== undefined &&
			(!Number.isInteger(item.expected_time) || item.expected_time < 0)
		) {
			throw new Error("completeTheSentence.expected_time must be a non-negative integer");
		}
	}

	const gameSkillListeningSpeaking = completeTheSentences[0]?.skill_listening_speaking ?? false;
	const gameSkillLangNature = completeTheSentences[0]?.skill_lang_nature ?? false;
	const gameSkillReading = completeTheSentences[0]?.skill_reading ?? false;
	const gameSkillWriting = completeTheSentences[0]?.skill_writing ?? false;
	const gameAudioQuestion = completeTheSentences[0]?.audio_question ?? false;
	const gameAudioChoice = completeTheSentences[0]?.audio_choice ?? false;
	const gameAudioAssistantVoice = completeTheSentences[0]?.audio_assistant_voice ?? false;
	const gameAudioBackground = completeTheSentences[0]?.audio_background ?? false;

	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const schema = await resolveCompleteTheSentenceSchema(client);

		const gameRes = await client.query("SELECT id FROM game_info WHERE id = $1", [idGameInfo]);
		if (gameRes.rowCount === 0) throw new Error("game_info not found");

		const createdRows: any[] = [];
		for (const item of completeTheSentences) {
			const serializedQuestionAnswer = serializeQuestionAnswerForDb(item.question_answer, "completeTheSentence.question_answer");
			const result = await client.query(
				`
				INSERT INTO ${schema.tableName} (
					id_game_info,
					no,
					question_answer,
					hint,
					${schema.soundQuestionColumn},
					${schema.imageQuestionColumn},
					sound_hint,
					image_hint,
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
				VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
				RETURNING id, id_game_info, no, question_answer, hint,
					${schema.soundQuestionColumn} AS sound_question_answer,
					${schema.imageQuestionColumn} AS image_question_answer,
					sound_hint, image_hint,
					skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing,
					audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at
				`,
				[
					idGameInfo,
					item.no,
					serializedQuestionAnswer ?? null,
					item.hint ?? null,
					item.sound_question_answer ?? null,
					item.image_question_answer ?? null,
					item.sound_hint ?? null,
					item.image_hint ?? null,
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

			createdRows.push(mapQuestionAnswerField(result.rows[0]));
		}

		await client.query("COMMIT");
		return createdRows;
	} catch (error: any) {
		await client.query("ROLLBACK");
		if (error?.code === "23505") {
			throw new Error("duplicate complete the sentence no for this game");
		}
		throw error;
	} finally {
		client.release();
	}
}

export async function getCompleteTheSentenceByGameId(idGameInfo: number) {
	if (!Number.isInteger(idGameInfo) || idGameInfo <= 0) {
		throw new Error("id_game_info must be a positive integer");
	}

	const client = await pool.connect();
	try {
		const schema = await resolveCompleteTheSentenceSchema(client);
		const result = await client.query(
			`
			SELECT id, id_game_info, no, question_answer, hint,
				${schema.soundQuestionColumn} AS sound_question_answer,
				${schema.imageQuestionColumn} AS image_question_answer,
				sound_hint, image_hint,
				skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing,
				audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
			FROM ${schema.tableName}
			WHERE id_game_info = $1 AND delete_at IS NULL
			ORDER BY no ASC
			`,
			[idGameInfo]
		);

		return result.rows.map(mapQuestionAnswerField);
	} finally {
		client.release();
	}
}

export async function getAllCompleteTheSentences() {
	const client = await pool.connect();
	try {
		const schema = await resolveCompleteTheSentenceSchema(client);
		const result = await client.query(
			`
			SELECT id, id_game_info, no, question_answer, hint,
				${schema.soundQuestionColumn} AS sound_question_answer,
				${schema.imageQuestionColumn} AS image_question_answer,
				sound_hint, image_hint,
				skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing,
				audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
			FROM ${schema.tableName}
			WHERE delete_at IS NULL
			ORDER BY id_game_info ASC, no ASC
			`
		);

		return result.rows.map(mapQuestionAnswerField);
	} finally {
		client.release();
	}
}

export async function updateCompleteTheSentenceById(completeTheSentenceId: number, payload: UpdateCompleteTheSentenceInput) {
	if (!Number.isInteger(completeTheSentenceId) || completeTheSentenceId <= 0) {
		throw new Error("invalid complete the sentence id");
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
	if (Object.prototype.hasOwnProperty.call(payload, "question_answer")) {
		serializeQuestionAnswerForDb(payload.question_answer, "question_answer");
	}

	const client = await pool.connect();
	try {
		await client.query("BEGIN");

		const schema = await resolveCompleteTheSentenceSchema(client);
		const existing = await client.query(
			`SELECT id, id_game_info, no FROM ${schema.tableName} WHERE id = $1 AND delete_at IS NULL FOR UPDATE`,
			[completeTheSentenceId]
		);

		if (existing.rowCount === 0) throw new Error("complete the sentence not found");

		const currentCompleteTheSentence = existing.rows[0];
		if (Object.prototype.hasOwnProperty.call(payload, "no") && payload.no !== currentCompleteTheSentence.no) {
			const targetNo = payload.no as number;

			const conflict = await client.query(
				`SELECT id
				 FROM ${schema.tableName}
				 WHERE id_game_info = $1 AND no = $2 AND delete_at IS NULL
				 FOR UPDATE`,
				[currentCompleteTheSentence.id_game_info, targetNo]
			);

			if ((conflict.rowCount ?? 0) > 0 && conflict.rows[0].id !== completeTheSentenceId) {
				const tempNoRes = await client.query(
					`SELECT COALESCE(MIN(no), 0) - 1 AS temp_no
					 FROM ${schema.tableName}
					 WHERE id_game_info = $1 AND delete_at IS NULL`,
					[currentCompleteTheSentence.id_game_info]
				);

				const tempNo = tempNoRes.rows[0].temp_no;
				await client.query(
					`UPDATE ${schema.tableName}
					 SET no = $1, update_at = CURRENT_TIMESTAMP
					 WHERE id = $2`,
					[tempNo, conflict.rows[0].id]
				);

				await client.query(
					`UPDATE ${schema.tableName}
					 SET no = $1, update_at = CURRENT_TIMESTAMP
					 WHERE id = $2`,
					[targetNo, completeTheSentenceId]
				);

				await client.query(
					`UPDATE ${schema.tableName}
					 SET no = $1, update_at = CURRENT_TIMESTAMP
					 WHERE id = $2`,
					[currentCompleteTheSentence.no, conflict.rows[0].id]
				);
			} else {
				await client.query(
					`UPDATE ${schema.tableName}
					 SET no = $1, update_at = CURRENT_TIMESTAMP
					 WHERE id = $2`,
					[targetNo, completeTheSentenceId]
				);
			}
		}

		const updates: string[] = [];
		const values: any[] = [];
		let idx = 1;

		if (Object.prototype.hasOwnProperty.call(payload, "question_answer")) {
			const serializedQuestionAnswer = serializeQuestionAnswerForDb(payload.question_answer, "question_answer");
			updates.push(`question_answer = $${idx++}`);
			values.push(serializedQuestionAnswer ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "hint")) {
			updates.push(`hint = $${idx++}`);
			values.push(payload.hint ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "sound_question_answer")) {
			updates.push(`${schema.soundQuestionColumn} = $${idx++}`);
			values.push(payload.sound_question_answer ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "image_question_answer")) {
			updates.push(`${schema.imageQuestionColumn} = $${idx++}`);
			values.push(payload.image_question_answer ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "sound_hint")) {
			updates.push(`sound_hint = $${idx++}`);
			values.push(payload.sound_hint ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "image_hint")) {
			updates.push(`image_hint = $${idx++}`);
			values.push(payload.image_hint ?? null);
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
			const sql = `
				UPDATE ${schema.tableName}
				SET ${updates.join(", ")}, update_at = CURRENT_TIMESTAMP
				WHERE id = $${idx} AND delete_at IS NULL
			`;
			values.push(completeTheSentenceId);
			await client.query(sql, values);
		}

		const updated = await client.query(
			`SELECT id, id_game_info, no, question_answer, hint,
				${schema.soundQuestionColumn} AS sound_question_answer,
				${schema.imageQuestionColumn} AS image_question_answer,
				sound_hint, image_hint,
				skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing,
				audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
			 FROM ${schema.tableName}
			 WHERE id = $1`,
			[completeTheSentenceId]
		);

		await client.query("COMMIT");
		return mapQuestionAnswerField(updated.rows[0]);
	} catch (error: any) {
		await client.query("ROLLBACK");
		if (error?.code === "23505") {
			throw new Error("duplicate complete the sentence no for this game");
		}
		throw error;
	} finally {
		client.release();
	}
}

export async function softDeleteCompleteTheSentenceById(completeTheSentenceId: number) {
	if (!Number.isInteger(completeTheSentenceId) || completeTheSentenceId <= 0) {
		throw new Error("invalid complete the sentence id");
	}

	const client = await pool.connect();
	try {
		const schema = await resolveCompleteTheSentenceSchema(client);
		const result = await client.query(
			`
			UPDATE ${schema.tableName}
			SET delete_at = CURRENT_TIMESTAMP, update_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND delete_at IS NULL
			RETURNING id
			`,
			[completeTheSentenceId]
		);

		if (result.rowCount === 0) throw new Error("complete the sentence not found");

		return { deleted: true };
	} finally {
		client.release();
	}
}

export async function hardDeleteCompleteTheSentenceById(completeTheSentenceId: number) {
	if (!Number.isInteger(completeTheSentenceId) || completeTheSentenceId <= 0) {
		throw new Error("invalid complete the sentence id");
	}

	const client = await pool.connect();
	try {
		const schema = await resolveCompleteTheSentenceSchema(client);
		const result = await client.query(
			`DELETE FROM ${schema.tableName} WHERE id = $1 RETURNING id`,
			[completeTheSentenceId]
		);

		if (result.rowCount === 0) throw new Error("complete the sentence not found");

		return { deleted: true };
	} finally {
		client.release();
	}
}

export async function hardDeleteCompleteTheSentenceMediaFieldById(completeTheSentenceId: number, field: string) {
	if (!Number.isInteger(completeTheSentenceId) || completeTheSentenceId <= 0) {
		throw new Error("invalid complete the sentence id");
	}

	const targetField = toCompleteTheSentenceMediaField(field);

	const client = await pool.connect();
	try {
		const result = await client.query(
			`
			UPDATE complete_the_sentence
			SET ${targetField} = NULL 
			WHERE id = $1 AND delete_at IS NULL
			RETURNING id, id_game_info, no, question_answer, hint, sound_question, image_question, sound_hint, image_hint,
				skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing,
				audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
			`,
			[completeTheSentenceId]
		);

		if (result.rowCount === 0) throw new Error("complete the sentence not found");

		return { deleted_field: targetField, completeTheSentence: result.rows[0] };
	} finally {
		client.release();
	}
}