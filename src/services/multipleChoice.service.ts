import pool from "./db";

export interface CreateChoiceInput {
	choice?: string | null;
	is_correct: boolean;
	sound_choice?: string | null;
	image_choice?: string | null;
}

export interface CreateQuestionInput {
	no: number;
	question?: string | null;
	hint?: string | null;
	sound_question?: string | null;
	image_question?: string | null;
	sound_hint?: string | null;
	image_hint?: string | null;
	shuffle_answer?: boolean;
	skill_listening_speaking?: boolean;
	skill_lang_nature?: boolean;
	skill_reading?: boolean;
	skill_writing?: boolean;
	audio_question?: boolean;
	audio_choice?: boolean;
	audio_assistant_voice?: boolean;
	audio_background?: boolean;
	expected_time?: number;
	choices: CreateChoiceInput[];
}

const QUESTION_MULTIPLE_MEDIA_FIELDS = [
	"sound_question",
	"image_question",
	"hint",
	"sound_hint",
	"image_hint"
] as const;

const CHOICE_MULTIPLE_MEDIA_FIELDS = ["sound_choice", "image_choice"] as const;

type QuestionMultipleMediaField = (typeof QUESTION_MULTIPLE_MEDIA_FIELDS)[number];
type ChoiceMultipleMediaField = (typeof CHOICE_MULTIPLE_MEDIA_FIELDS)[number];

function toQuestionMultipleMediaField(field: string): QuestionMultipleMediaField {
	if ((QUESTION_MULTIPLE_MEDIA_FIELDS as readonly string[]).includes(field)) {
		return field as QuestionMultipleMediaField;
	}

	throw new Error("invalid question_multiple media field");
}

function toChoiceMultipleMediaField(field: string): ChoiceMultipleMediaField {
	if ((CHOICE_MULTIPLE_MEDIA_FIELDS as readonly string[]).includes(field)) {
		return field as ChoiceMultipleMediaField;
	}

	throw new Error("invalid choice_multiple media field");
}

export async function createQuestionMultipleWithChoices(idGameInfo: number, questions: CreateQuestionInput[]) {
	if (!Number.isInteger(idGameInfo) || idGameInfo <= 0) throw new Error("id_game_info must be a positive integer");
	if (!Array.isArray(questions) || questions.length === 0) throw new Error("questions must be a non-empty array");

	const noSet = new Set<number>();
	for (const questionItem of questions) {
		if (!Number.isInteger(questionItem.no)) throw new Error("each question.no must be integer");
		if (noSet.has(questionItem.no)) throw new Error("question no must be unique in the request");
		noSet.add(questionItem.no);
		if (questionItem.question !== undefined && questionItem.question !== null && typeof questionItem.question !== "string") throw new Error("each question.question must be a string");
		if (!Array.isArray(questionItem.choices) || questionItem.choices.length === 0) throw new Error("each question must have at least 1 choice");
		if (
			Object.prototype.hasOwnProperty.call(questionItem, "shuffle_answer") &&
			typeof questionItem.shuffle_answer !== "boolean"
		) {
			throw new Error("each question.shuffle_answer must be boolean");
		}
		if (
			Object.prototype.hasOwnProperty.call(questionItem, "skill_listening_speaking") &&
			typeof questionItem.skill_listening_speaking !== "boolean"
		) {
			throw new Error("each question.skill_listening_speaking must be boolean");
		}
		if (
			Object.prototype.hasOwnProperty.call(questionItem, "skill_lang_nature") &&
			typeof questionItem.skill_lang_nature !== "boolean"
		) {
			throw new Error("each question.skill_lang_nature must be boolean");
		}
		if (
			Object.prototype.hasOwnProperty.call(questionItem, "skill_reading") &&
			typeof questionItem.skill_reading !== "boolean"
		) {
			throw new Error("each question.skill_reading must be boolean");
		}
		if (
			Object.prototype.hasOwnProperty.call(questionItem, "skill_writing") &&
			typeof questionItem.skill_writing !== "boolean"
		) {
			throw new Error("each question.skill_writing must be boolean");
		}
		if (
			Object.prototype.hasOwnProperty.call(questionItem, "audio_question") &&
			typeof questionItem.audio_question !== "boolean"
		) {
			throw new Error("each question.audio_question must be boolean");
		}
		if (
			Object.prototype.hasOwnProperty.call(questionItem, "audio_choice") &&
			typeof questionItem.audio_choice !== "boolean"
		) {
			throw new Error("each question.audio_choice must be boolean");
		}
		if (
			Object.prototype.hasOwnProperty.call(questionItem, "audio_assistant_voice") &&
			typeof questionItem.audio_assistant_voice !== "boolean"
		) {
			throw new Error("each question.audio_assistant_voice must be boolean");
		}
		if (
			Object.prototype.hasOwnProperty.call(questionItem, "audio_background") &&
			typeof questionItem.audio_background !== "boolean"
		) {
			throw new Error("each question.audio_background must be boolean");
		}
		if (
			Object.prototype.hasOwnProperty.call(questionItem, "expected_time") &&
			questionItem.expected_time !== null &&
			questionItem.expected_time !== undefined &&
			(!Number.isInteger(questionItem.expected_time) || questionItem.expected_time < 0)
		) {
			throw new Error("each question.expected_time must be a non-negative integer");
		}

		for (const choiceItem of questionItem.choices) {
			if (choiceItem.choice !== undefined && choiceItem.choice !== null && typeof choiceItem.choice !== "string") throw new Error("each choice.choice must be a string");
			if (typeof choiceItem.is_correct !== "boolean") throw new Error("each choice.is_correct must be boolean");
		}
	}

	const client = await pool.connect();

	try {
		await client.query("BEGIN");

		const gameRes = await client.query("SELECT id FROM game_info WHERE id = $1", [idGameInfo]);
		if (gameRes.rowCount === 0) throw new Error("game_info not found");

		const createdQuestions: any[] = [];

		for (const questionItem of questions) {
			// Insert Question 
			const questionRes = await client.query(
				`
				INSERT INTO question_multiple (
					id_game_info,
					no,
					question,
					hint,
					sound_question,
					image_question,
					sound_hint,
					image_hint,
					shuffle_answer,
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
				RETURNING id, id_game_info, no, question, hint, sound_question, image_question, sound_hint, image_hint, shuffle_answer, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at
				`,
				[
					idGameInfo,
					questionItem.no,
					questionItem.question ?? null,
					questionItem.hint ?? null,
					questionItem.sound_question ?? null,
					questionItem.image_question ?? null,
					questionItem.sound_hint ?? null,
					questionItem.image_hint ?? null,
					questionItem.shuffle_answer ?? false,
					questionItem.skill_listening_speaking ?? false,
					questionItem.skill_lang_nature ?? false,
					questionItem.skill_reading ?? false,
					questionItem.skill_writing ?? false,
					questionItem.audio_question ?? false,
					questionItem.audio_choice ?? false,
					questionItem.audio_assistant_voice ?? false,
					questionItem.audio_background ?? false,
					questionItem.expected_time ?? 0,
				]
			);

			const createdQuestion = questionRes.rows[0];

			const createdChoices: any[] = [];
			for (const choiceItem of questionItem.choices) {
				// Insert Choice
				const choiceRes = await client.query(
					`
					INSERT INTO choice_multiple (
						id_question_multiple,
						choice,
						is_correct,
						sound_choice,
						image_choice
					)
					VALUES ($1, $2, $3, $4, $5)
					RETURNING id, id_question_multiple, choice, is_correct, sound_choice, image_choice, create_at
					`,
					[
						createdQuestion.id,
						choiceItem.choice ?? null,
						choiceItem.is_correct,
						choiceItem.sound_choice ?? null,
						choiceItem.image_choice ?? null,
					]
				);

				createdChoices.push(choiceRes.rows[0]);
			}

			createdQuestions.push({
				...createdQuestion,
				choices: createdChoices,
			});
		}

		await client.query("COMMIT");
		return createdQuestions;
	} catch (error: any) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

export async function getQuestionsByGameId(idGameInfo: number) {
	if (!Number.isInteger(idGameInfo) || idGameInfo <= 0) {
		throw new Error("id_game_info must be a positive integer");
	}
	const client = await pool.connect();
	try {
		const questionRes = await client.query(
			`
			SELECT id, id_game_info, no, question, hint, sound_question, image_question, sound_hint, image_hint, shuffle_answer, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at
            FROM question_multiple
            WHERE id_game_info = $1 AND delete_at IS NULL
            ORDER BY no ASC
            `,
			[idGameInfo]
		);
		const questions = questionRes.rows;

		for (const question of questions) {
			const choiceRes = await client.query(
				`
                SELECT id, id_question_multiple, choice, is_correct, sound_choice, image_choice, create_at
                FROM choice_multiple
                WHERE id_question_multiple = $1 AND delete_at IS NULL
                `,
				[question.id]
			);
			question.choices = choiceRes.rows;
		}
		return questions;
	} finally {
		client.release();
	}
}

export async function getAllQuestions() {
	const client = await pool.connect();
	try {
		const questionRes = await client.query(
			`
			SELECT id, id_game_info, no, question, hint, sound_question, image_question, sound_hint, image_hint, shuffle_answer, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at
            FROM question_multiple
            WHERE delete_at IS NULL
            ORDER BY id_game_info ASC, no ASC
            `
		);
		const questions = questionRes.rows;
		for (const question of questions) {
			const choiceRes = await client.query(
				`
                SELECT id, id_question_multiple, choice, is_correct, sound_choice, image_choice, create_at
                FROM choice_multiple
                WHERE id_question_multiple = $1 AND delete_at IS NULL
                `,
				[question.id]
			);
			question.choices = choiceRes.rows;
		}
		return questions;
	} finally {
		client.release();
	}
}

export interface UpdateQuestionInput {
	no?: number;
	question?: string | null;
	hint?: string | null;
	sound_question?: string | null;
	image_question?: string | null;
	sound_hint?: string | null;
	image_hint?: string | null;
	shuffle_answer?: boolean;
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

export async function updateQuestionMultipleById(questionId: number, payload: UpdateQuestionInput) {
	if (!Number.isInteger(questionId) || questionId <= 0) {
		throw new Error("invalid question id");
	}
	if (Object.prototype.hasOwnProperty.call(payload, "no") && !Number.isInteger(payload.no)) {
		throw new Error("no must be integer");
	}
	if (Object.prototype.hasOwnProperty.call(payload, "shuffle_answer") && typeof payload.shuffle_answer !== "boolean") {
		throw new Error("shuffle_answer must be boolean");
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

		const existing = await client.query(
			`SELECT id, id_game_info, no
			 FROM question_multiple
			 WHERE id = $1 AND delete_at IS NULL
			 FOR UPDATE`,
			[questionId]
		);

		if (existing.rowCount === 0) throw new Error("question not found");

		const currentQuestion = existing.rows[0];
		if (Object.prototype.hasOwnProperty.call(payload, "no") && payload.no !== currentQuestion.no) {
			const targetNo = payload.no as number;

			const conflict = await client.query(
				`SELECT id
				 FROM question_multiple
				 WHERE id_game_info = $1 AND no = $2 AND delete_at IS NULL
				 FOR UPDATE`,
				[currentQuestion.id_game_info, targetNo]
			);

			if ((conflict.rowCount ?? 0) > 0 && conflict.rows[0].id !== questionId) {
				const tempNoRes = await client.query(
					`SELECT COALESCE(MIN(no), 0) - 1 AS temp_no
					 FROM question_multiple
					 WHERE id_game_info = $1 AND delete_at IS NULL`,
					[currentQuestion.id_game_info]
				);

				const tempNo = tempNoRes.rows[0].temp_no;
				await client.query(
					`UPDATE question_multiple
					 SET no = $1, update_at = CURRENT_TIMESTAMP
					 WHERE id = $2`,
					[tempNo, conflict.rows[0].id]
				);

				await client.query(
					`UPDATE question_multiple
					 SET no = $1, update_at = CURRENT_TIMESTAMP
					 WHERE id = $2`,
					[targetNo, questionId]
				);

				await client.query(
					`UPDATE question_multiple
					 SET no = $1, update_at = CURRENT_TIMESTAMP
					 WHERE id = $2`,
					[currentQuestion.no, conflict.rows[0].id]
				);
			} else {
				await client.query(
					`UPDATE question_multiple
					 SET no = $1, update_at = CURRENT_TIMESTAMP
					 WHERE id = $2`,
					[targetNo, questionId]
				);
			}
		}

		const updates: string[] = [];
		const values: any[] = [];
		let idx = 1;

		if (Object.prototype.hasOwnProperty.call(payload, "question")) {
			updates.push(`question = $${idx++}`); values.push(payload.question ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "hint")) {
			updates.push(`hint = $${idx++}`); values.push(payload.hint ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "sound_question")) {
			updates.push(`sound_question = $${idx++}`);
			values.push(payload.sound_question ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "image_question")) {
			updates.push(`image_question = $${idx++}`);
			values.push(payload.image_question ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "sound_hint")) {
			updates.push(`sound_hint = $${idx++}`);
			values.push(payload.sound_hint ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "image_hint")) {
			updates.push(`image_hint = $${idx++}`);
			values.push(payload.image_hint ?? null);
		}
		if (Object.prototype.hasOwnProperty.call(payload, "shuffle_answer")) {
			updates.push(`shuffle_answer = $${idx++}`);
			values.push(payload.shuffle_answer);
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
			const updateSql = `
			UPDATE question_multiple
			SET ${updates.join(", ")}, update_at = CURRENT_TIMESTAMP
			WHERE id = $${idx}
		`;
			values.push(questionId);
			await client.query(updateSql, values);
		}

		const updated = await client.query(
			`SELECT id, id_game_info, no, question, hint, sound_question, image_question, sound_hint, image_hint, shuffle_answer, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
			 FROM question_multiple
			 WHERE id = $1`,
			[questionId]
		);

		await client.query("COMMIT");
		return updated.rows[0];
	} catch (error) {
		await client.query("ROLLBACK");
		throw error;
	} finally {
		client.release();
	}
}

export interface BulkUpdateChoiceInput {
	id: number;
	choice?: string | null;
	is_correct?: boolean;
	sound_choice?: string | null;
	image_choice?: string | null;
}

export async function updateChoicesByQuestionId(idQuestionMultiple: number, choices: BulkUpdateChoiceInput[]) {
	if (!Number.isInteger(idQuestionMultiple) || idQuestionMultiple <= 0) {
		throw new Error("invalid id_question_multiple");
	}
	if (!Array.isArray(choices) || choices.length === 0) {
		throw new Error("choices must be a non-empty array");
	}

	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const questionRes = await client.query(`SELECT id FROM question_multiple WHERE id = $1 AND delete_at IS NULL`, [idQuestionMultiple]);
		if (questionRes.rowCount === 0) throw new Error("question not found");

		const existingChoicesRes = await client.query(`SELECT id FROM choice_multiple WHERE id_question_multiple = $1 AND delete_at IS NULL`, [idQuestionMultiple]);
		const existingChoiceIds = new Set<number>(existingChoicesRes.rows.map((r: any) => r.id));

		const updatedRows: any[] = [];

		for (const item of choices) {
			if (!Number.isInteger(item.id) || item.id <= 0) throw new Error("each choice.id must be a positive integer");
			if (!existingChoiceIds.has(item.id)) throw new Error(`choice id ${item.id} does not belong to this question`);

			const updates: string[] = [];
			const values: any[] = [];
			let idx = 1;

			if (Object.prototype.hasOwnProperty.call(item, "choice")) {
				updates.push(`choice = $${idx++}`); values.push(item.choice ?? null);
			}
			if (Object.prototype.hasOwnProperty.call(item, "is_correct")) {
				updates.push(`is_correct = $${idx++}`); values.push(item.is_correct);
			}
			if (Object.prototype.hasOwnProperty.call(item, "sound_choice")) {
				updates.push(`sound_choice = $${idx++}`);
				values.push(item.sound_choice ?? null);
			}
			if (Object.prototype.hasOwnProperty.call(item, "image_choice")) {
				updates.push(`image_choice = $${idx++}`);
				values.push(item.image_choice ?? null);
			}

			if (updates.length === 0) throw new Error(`no updatable fields provided for choice id ${item.id}`);

			const sql = `
				UPDATE choice_multiple
				SET ${updates.join(", ")}, update_at = CURRENT_TIMESTAMP
				WHERE id = $${idx} AND id_question_multiple = $${idx + 1} AND delete_at IS NULL
				RETURNING id, id_question_multiple, choice, is_correct, sound_choice, image_choice, create_at, update_at
			`;
			values.push(item.id, idQuestionMultiple);
			const updated = await client.query(sql, values);
			if (updated.rowCount === 0) {
				throw new Error(`failed to update choice id ${item.id}`);
			}
			updatedRows.push(updated.rows[0]);
		}

		await client.query("COMMIT");
		return updatedRows;
	} catch (err) {
		await client.query("ROLLBACK");
		throw err;
	} finally {
		client.release();
	}
}

export async function createChoicesByQuestionId(
	idQuestionMultiple: number,
	choices: CreateChoiceInput[]
) {
	if (!Number.isInteger(idQuestionMultiple) || idQuestionMultiple <= 0) {
		throw new Error("invalid id_question_multiple");
	}
	if (!Array.isArray(choices) || choices.length === 0) {
		throw new Error("choices must be a non-empty array");
	}

	const client = await pool.connect();
	try {
		await client.query("BEGIN");

		const questionRes = await client.query(
			`SELECT id FROM question_multiple WHERE id = $1 AND delete_at IS NULL`,
			[idQuestionMultiple]
		);
		if (questionRes.rowCount === 0) throw new Error("question not found");

		const createdRows: any[] = [];

		for (const item of choices) {
			const sql = `
        INSERT INTO choice_multiple
          (id_question_multiple, choice, is_correct, sound_choice, image_choice)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, id_question_multiple, choice, is_correct, sound_choice, image_choice, create_at, update_at
      `;
			const values = [
				idQuestionMultiple,
				Object.prototype.hasOwnProperty.call(item, "choice") ? item.choice ?? null : null,
				Object.prototype.hasOwnProperty.call(item, "is_correct") ? item.is_correct : false,
				Object.prototype.hasOwnProperty.call(item, "sound_choice") ? item.sound_choice ?? null : null,
				Object.prototype.hasOwnProperty.call(item, "image_choice") ? item.image_choice ?? null : null,
			];

			const inserted = await client.query(sql, values);
			if (inserted.rowCount === 0) throw new Error("failed to create choice");
			createdRows.push(inserted.rows[0]);
		}

		await client.query("COMMIT");
		return createdRows;
	} catch (err) {
		await client.query("ROLLBACK");
		throw err;
	} finally {
		client.release();
	}
}

export async function softDeleteQuestionById(questionId: number) {
	if (!Number.isInteger(questionId) || questionId <= 0) {
		throw new Error("invalid question id");
	}
	const client = await pool.connect();
	try {
		await client.query("BEGIN");

		const questionRes = await client.query(
			`SELECT id FROM question_multiple WHERE id = $1 AND delete_at IS NULL`,
			[questionId]
		);
		if (questionRes.rowCount === 0) {
			throw new Error("question not found");
		}

		const updatedChoices = await client.query(
			`UPDATE choice_multiple SET delete_at = CURRENT_TIMESTAMP WHERE id_question_multiple = $1 AND delete_at IS NULL RETURNING id`,
			[questionId]
		);

		const updatedQuestion = await client.query(
			`UPDATE question_multiple SET delete_at = CURRENT_TIMESTAMP WHERE id = $1 AND delete_at IS NULL RETURNING id`,
			[questionId]
		);

		await client.query("COMMIT");
		return { updatedChoices: updatedChoices.rowCount, updatedQuestion: updatedQuestion.rowCount };
	} catch (err) {
		await client.query("ROLLBACK");
		throw err;
	} finally {
		client.release();
	}
}

export async function hardDeleteQuestionById(questionId: number) {
	if (!Number.isInteger(questionId) || questionId <= 0) {
		throw new Error("invalid question id");
	}
	const client = await pool.connect();
	try {
		await client.query("BEGIN");

		const questionRes = await client.query(
			`SELECT id FROM question_multiple WHERE id = $1`,
			[questionId]
		);
		if (questionRes.rowCount === 0) {
			throw new Error("question not found");
		}

		const deletedChoices = await client.query(
			`DELETE FROM choice_multiple WHERE id_question_multiple = $1 RETURNING id`,
			[questionId]
		);

		const deletedQuestion = await client.query(
			`DELETE FROM question_multiple WHERE id = $1 RETURNING id`,
			[questionId]
		);

		await client.query("COMMIT");
		return { deletedChoices: deletedChoices.rowCount, deletedQuestion: deletedQuestion.rowCount };
	} catch (err) {
		await client.query("ROLLBACK");
		throw err;
	} finally {
		client.release();
	}
}

export async function hardDeleteChoicesByIds(questionId: number, choiceIds: number[]) {
	if (!Number.isInteger(questionId) || questionId <= 0) {
		throw new Error("invalid question id");
	}
	if (!Array.isArray(choiceIds) || choiceIds.length === 0) {
		throw new Error("choiceIds must be a non-empty array");
	}

	const normalizedChoiceIds = Array.from(
		new Set(
			choiceIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
		)
	);

	if (normalizedChoiceIds.length === 0) {
		throw new Error("choiceIds must contain positive integers");
	}

	const client = await pool.connect();
	try {
		await client.query("BEGIN");

		const questionRes = await client.query(
			`SELECT id FROM question_multiple WHERE id = $1`,
			[questionId]
		);
		if (questionRes.rowCount === 0) {
			throw new Error("question not found");
		}

		const ownedChoicesRes = await client.query(
			`SELECT id
			 FROM choice_multiple
			 WHERE id_question_multiple = $1 AND id = ANY($2::int[])`,
			[questionId, normalizedChoiceIds]
		);

		if (ownedChoicesRes.rowCount !== normalizedChoiceIds.length) {
			throw new Error("some choice ids are not found in this question");
		}

		const deletedRes = await client.query(
			`DELETE FROM choice_multiple
			 WHERE id_question_multiple = $1 AND id = ANY($2::int[])
			 RETURNING id`,
			[questionId, normalizedChoiceIds]
		);

		await client.query("COMMIT");
		return {
			id_question_multiple: questionId,
			deleted_choice_ids: deletedRes.rows.map((row: any) => row.id),
			deleted_count: deletedRes.rowCount,
		};
	} catch (err) {
		await client.query("ROLLBACK");
		throw err;
	} finally {
		client.release();
	}
}

export async function hardDeleteQuestionMediaFieldByQuestionId(questionId: number, field: string) {
	if (!Number.isInteger(questionId) || questionId <= 0) {
		throw new Error("invalid question id");
	}

	const targetField = toQuestionMultipleMediaField(field);

	const result = await pool.query(
		`
		UPDATE question_multiple
		SET ${targetField} = NULL
		WHERE id = $1 AND delete_at IS NULL
		RETURNING id, id_game_info, no, question, hint, sound_question, image_question, sound_hint, image_hint, shuffle_answer, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at, update_at
		`,
		[questionId]
	);

	if (result.rowCount === 0) {
		throw new Error("question not found");
	}

	return {
		id_question_multiple: questionId,
		deleted_field: targetField,
		question: result.rows[0],
	};
}

export async function hardDeleteChoiceMediaFieldByChoiceId(choiceId: number, field: string) {
	if (!Number.isInteger(choiceId) || choiceId <= 0) {
		throw new Error("invalid choice id");
	}

	const targetField = toChoiceMultipleMediaField(field);

	const result = await pool.query(
		`
		UPDATE choice_multiple
		SET ${targetField} = NULL
		WHERE id = $1 AND delete_at IS NULL
		RETURNING id, id_question_multiple, choice, is_correct, sound_choice, image_choice, create_at, update_at
		`,
		[choiceId]
	);

	if (result.rowCount === 0) {
		throw new Error("choice not found");
	}

	return {
		id_choice_multiple: choiceId,
		deleted_field: targetField,
		choice: result.rows[0],
	};
}