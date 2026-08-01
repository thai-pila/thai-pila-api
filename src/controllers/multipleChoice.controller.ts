import { Request, Response } from "express";
import {
	CreateQuestionInput,
	createQuestionMultipleWithChoices,
	getQuestionsByGameId,
	getAllQuestions,
	updateQuestionMultipleById,
	updateChoicesByQuestionId,
	createChoicesByQuestionId,
	softDeleteQuestionById,
	hardDeleteQuestionById,
	hardDeleteChoicesByIds,
	hardDeleteQuestionMediaFieldByQuestionId,
	hardDeleteChoiceMediaFieldByChoiceId,
} from "../services/multipleChoice.service";

const QUESTION_MULTIPLE_MEDIA_FIELDS = [
	"sound_question",
	"image_question",
	"hint",
	"sound_hint",
	"image_hint",
	] as const;

const CHOICE_MULTIPLE_MEDIA_FIELDS = [
	"sound_choice",
	"image_choice",
] as const;

function parseOptionalBoolean(value: any): boolean | undefined {
	if (typeof value === "boolean") return value;
	if (typeof value === "string") {
		if (value === "true") return true;
		if (value === "false") return false;
	}
	return undefined;
}

function parseOptionalInteger(value: any): number | undefined {
	if (value === null || value === undefined || value === "") return undefined;
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed < 0) return undefined;
	return parsed;
}

function parseQuestionsInput(rawQuestions: any): CreateQuestionInput[] {
	if (!rawQuestions) {
		throw new Error("questions is required");
	}

	const parsed = typeof rawQuestions === "string" ? JSON.parse(rawQuestions) : rawQuestions;
	if (!Array.isArray(parsed)) {
		throw new Error("questions must be array");
	}

	const normalizedQuestions = parsed.map((item: any) => {
		const normalized: any = { ...item };

		if (Object.prototype.hasOwnProperty.call(normalized, "shuffle_answer")) {
			const parsedValue = parseOptionalBoolean(normalized.shuffle_answer);
			normalized.shuffle_answer = parsedValue === undefined ? normalized.shuffle_answer : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(normalized, "skill_listening_speaking")) {
			const parsedValue = parseOptionalBoolean(normalized.skill_listening_speaking);
			normalized.skill_listening_speaking = parsedValue === undefined ? normalized.skill_listening_speaking : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(normalized, "skill_lang_nature")) {
			const parsedValue = parseOptionalBoolean(normalized.skill_lang_nature);
			normalized.skill_lang_nature = parsedValue === undefined ? normalized.skill_lang_nature : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(normalized, "skill_reading")) {
			const parsedValue = parseOptionalBoolean(normalized.skill_reading);
			normalized.skill_reading = parsedValue === undefined ? normalized.skill_reading : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(normalized, "skill_writing")) {
			const parsedValue = parseOptionalBoolean(normalized.skill_writing);
			normalized.skill_writing = parsedValue === undefined ? normalized.skill_writing : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(normalized, "audio_question")) {
			const parsedValue = parseOptionalBoolean(normalized.audio_question);
			normalized.audio_question = parsedValue === undefined ? normalized.audio_question : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(normalized, "audio_choice")) {
			const parsedValue = parseOptionalBoolean(normalized.audio_choice);
			normalized.audio_choice = parsedValue === undefined ? normalized.audio_choice : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(normalized, "audio_assistant_voice")) {
			const parsedValue = parseOptionalBoolean(normalized.audio_assistant_voice);
			normalized.audio_assistant_voice = parsedValue === undefined ? normalized.audio_assistant_voice : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(normalized, "audio_background")) {
			const parsedValue = parseOptionalBoolean(normalized.audio_background);
			normalized.audio_background = parsedValue === undefined ? normalized.audio_background : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(normalized, "expected_time")) {
			const parsedValue = parseOptionalInteger(normalized.expected_time);
			normalized.expected_time = parsedValue === undefined ? normalized.expected_time : parsedValue;
		}

		return normalized;
	});

	return normalizedQuestions as CreateQuestionInput[];
}

export async function createQuestionMultipleController(req: Request, res: Response) {
	try {
		const idGameInfo = Number(req.params.gameId);
		if (!Number.isInteger(idGameInfo) || idGameInfo <= 0) {
			return res.status(400).json({ error: "invalid game id" });
		}

		const questions = parseQuestionsInput(req.body?.questions);

		const created = await createQuestionMultipleWithChoices(idGameInfo, questions);

		const normalized = created.map((q: any) => {
			const { id_game_info, ...rest } = q;
			return rest;
		});

		return res.status(201).json({ id_game_info: idGameInfo, questions: normalized });
	} catch (err: any) {
		console.error("createQuestionMultipleController error", err);
		if (err?.message) {
			return res.status(400).json({ error: "bad_request", detail: err.message });
		}
		return res.status(500).json({ error: "internal_server_error" });
	}
}

export async function findQuestionsByGameIdController(req: Request, res: Response) {
    try {
        const gameId = Number(req.params.gameId);
        if (!Number.isInteger(gameId) || gameId <= 0) {
            return res.status(400).json({ error: "invalid game id" });
        }
        const questions = await getQuestionsByGameId(gameId);
        return res.json(questions);
    } catch (err) {
        console.error("get questions by game id error", err);
        return res.status(500).json({ error: "internal server error" });
    }
}

export async function findAllQuestionsController(req: Request, res: Response) {
    try {
        const questions = await getAllQuestions();
        return res.json(questions);
    } catch (err) {
        console.error("get all questions error", err);
        return res.status(500).json({ error: "internal server error" });
    }
}

export async function updateQuestionMultipleController(req: Request, res: Response) {
	try {
		const questionId = Number(req.params.questionId);
		if (!Number.isInteger(questionId) || questionId <= 0) {
			return res.status(400).json({ error: "invalid question id" });
		}

        const payload: any = {};
        const raw = req.body || {};

		if (Object.prototype.hasOwnProperty.call(raw, "no")) payload.no = Number(raw.no);
        if (Object.prototype.hasOwnProperty.call(raw, "question")) payload.question = raw.question;
        if (Object.prototype.hasOwnProperty.call(raw, "hint")) payload.hint = raw.hint;
        if (Object.prototype.hasOwnProperty.call(raw, "sound_question")) payload.sound_question = raw.sound_question;
        if (Object.prototype.hasOwnProperty.call(raw, "image_question")) payload.image_question = raw.image_question;
        if (Object.prototype.hasOwnProperty.call(raw, "sound_hint")) payload.sound_hint = raw.sound_hint;
        if (Object.prototype.hasOwnProperty.call(raw, "image_hint")) payload.image_hint = raw.image_hint;
		if (Object.prototype.hasOwnProperty.call(raw, "shuffle_answer")) {
			const parsedValue = parseOptionalBoolean(raw.shuffle_answer);
			payload.shuffle_answer = parsedValue === undefined ? raw.shuffle_answer : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(raw, "skill_listening_speaking")) {
			const parsedValue = parseOptionalBoolean(raw.skill_listening_speaking);
			payload.skill_listening_speaking = parsedValue === undefined ? raw.skill_listening_speaking : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(raw, "skill_lang_nature")) {
			const parsedValue = parseOptionalBoolean(raw.skill_lang_nature);
			payload.skill_lang_nature = parsedValue === undefined ? raw.skill_lang_nature : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(raw, "skill_reading")) {
			const parsedValue = parseOptionalBoolean(raw.skill_reading);
			payload.skill_reading = parsedValue === undefined ? raw.skill_reading : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(raw, "skill_writing")) {
			const parsedValue = parseOptionalBoolean(raw.skill_writing);
			payload.skill_writing = parsedValue === undefined ? raw.skill_writing : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(raw, "audio_question")) {
			const parsedValue = parseOptionalBoolean(raw.audio_question);
			payload.audio_question = parsedValue === undefined ? raw.audio_question : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(raw, "audio_choice")) {
			const parsedValue = parseOptionalBoolean(raw.audio_choice);
			payload.audio_choice = parsedValue === undefined ? raw.audio_choice : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(raw, "audio_assistant_voice")) {
			const parsedValue = parseOptionalBoolean(raw.audio_assistant_voice);
			payload.audio_assistant_voice = parsedValue === undefined ? raw.audio_assistant_voice : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(raw, "audio_background")) {
			const parsedValue = parseOptionalBoolean(raw.audio_background);
			payload.audio_background = parsedValue === undefined ? raw.audio_background : parsedValue;
		}
		if (Object.prototype.hasOwnProperty.call(raw, "expected_time")) {
			const parsedValue = parseOptionalInteger(raw.expected_time);
			payload.expected_time = parsedValue === undefined ? raw.expected_time : parsedValue;
		}

		const updated = await updateQuestionMultipleById(questionId, payload);
		return res.json(updated);
	} catch (err: any) {
		console.error("update question error", err);
		if (err?.message) {
			return res.status(400).json({ error: "bad_request", detail: err.message });
		}
		return res.status(500).json({ error: "internal server error" });
	}
}

export async function updateChoicesByQuestionController(req: Request, res: Response) {
	try {
		const questionId = Number(req.params.questionId);
		if (!Number.isInteger(questionId) || questionId <= 0) {
			return res.status(400).json({ error: "invalid question id" });
		}

        const raw = req.body || {};
        const rawChoices = raw.choices;
        const parsedChoices = typeof rawChoices === "string" ? JSON.parse(rawChoices) : rawChoices;
		
		if (!Array.isArray(parsedChoices) || parsedChoices.length === 0) {
			return res.status(400).json({ error: "choices must be a non-empty array" });
		}

        const choices = parsedChoices.map((item: any) => {
            const normalized: any = { ...item };
            if (Object.prototype.hasOwnProperty.call(normalized, "is_coorect") && !Object.prototype.hasOwnProperty.call(normalized, "is_correct")) {
                normalized.is_correct = normalized.is_coorect;
            }
            if (Object.prototype.hasOwnProperty.call(normalized, "is_correct") && typeof normalized.is_correct === "string") {
                normalized.is_correct = normalized.is_correct === "true" ? true : normalized.is_correct === "false" ? false : normalized.is_correct;
            }
            return normalized;
        });

		const updated = await updateChoicesByQuestionId(questionId, choices);
		return res.json({ id_question_multiple: questionId, choices: updated });
	} catch (err: any) {
		console.error("update choices by question error", err);
		if (err?.message) {
			return res.status(400).json({ error: "bad_request", detail: err.message });
		}
		return res.status(500).json({ error: "internal server error" });
	}
}

export async function createChoicesByQuestionController(req: Request, res: Response) {
  try {
	const questionId = Number(req.params.questionId);
	if (!Number.isInteger(questionId) || questionId <= 0) {
	  return res.status(400).json({ error: "invalid question id" });
	}

	const raw = req.body || {};
	const rawChoices = raw.choices;
	const parsedChoices = typeof rawChoices === "string" ? JSON.parse(rawChoices) : rawChoices;

	if (!Array.isArray(parsedChoices) || parsedChoices.length === 0) {
	  return res.status(400).json({ error: "choices must be a non-empty array" });
	}

	const choices = parsedChoices.map((item: any) => {
	  const normalized: any = { ...item };
	  if (
		Object.prototype.hasOwnProperty.call(normalized, "is_coorect") &&
		!Object.prototype.hasOwnProperty.call(normalized, "is_correct")
	  ) {
		normalized.is_correct = normalized.is_coorect;
	  }
	  if (
		Object.prototype.hasOwnProperty.call(normalized, "is_correct") &&
		typeof normalized.is_correct === "string"
	  ) {
		normalized.is_correct =
		  normalized.is_correct === "true"
			? true
			: normalized.is_correct === "false"
			? false
			: normalized.is_correct;
	  }
	  return normalized;
	});

	const created = await createChoicesByQuestionId(questionId, choices);
	return res.status(201).json({ id_question_multiple: questionId, choices: created });
  } catch (err: any) {
	console.error("create choices by question error", err);
	if (err?.message) {
	  return res.status(400).json({ error: "bad_request", detail: err.message });
	}
	return res.status(500).json({ error: "internal server error" });
  }
}

export async function softDeleteQuestionController(req: Request, res: Response) {
	try {
		const questionId = Number(req.params.questionId);
		if (!Number.isInteger(questionId) || questionId <= 0) {
			return res.status(400).json({ error: "invalid question id" });
		}

		const result = await softDeleteQuestionById(questionId);
		return res.json({ id_question_multiple: questionId, ...result });
	} catch (err: any) {
		console.error("soft delete question error", err);
		if (err?.message) {
			return res.status(400).json({ error: "bad_request", detail: err.message });
		}
		return res.status(500).json({ error: "internal server error" });
	}
}

export async function hardDeleteQuestionController(req: Request, res: Response) {
	try {
		const questionId = Number(req.params.questionId);
		if (!Number.isInteger(questionId) || questionId <= 0) {
			return res.status(400).json({ error: "invalid question id" });
		}

		const result = await hardDeleteQuestionById(questionId);
		return res.json({ id_question_multiple: questionId, ...result });
	} catch (err: any) {
		console.error("hard delete question error", err);
		if (err?.message) {
			return res.status(400).json({ error: "bad_request", detail: err.message });
		}
		return res.status(500).json({ error: "internal server error" });
	}
}

export async function hardDeleteChoicesController(req: Request, res: Response) {
	try {
		const questionId = Number(req.params.questionId);
		if (!Number.isInteger(questionId) || questionId <= 0) {
			return res.status(400).json({ error: "invalid question id" });
		}

		const rawChoiceIds = req.body?.choiceIds;
		if (!Array.isArray(rawChoiceIds) || rawChoiceIds.length === 0) {
			return res.status(400).json({ error: "choiceIds must be a non-empty array" });
		}

		const choiceIds = rawChoiceIds.map((id: any) => Number(id));
		const result = await hardDeleteChoicesByIds(questionId, choiceIds);
		return res.json(result);
	} catch (err: any) {
		console.error("hard delete multiple choices error", err);
		if (err?.message) {
			return res.status(400).json({ error: "bad_request", detail: err.message });
		}
		return res.status(500).json({ error: "internal server error" });
	}
}

export async function hardDeleteQuestionMediaFieldController(req: Request, res: Response) {
	try {
		const questionId = Number(req.params.questionId);
		if (!Number.isInteger(questionId) || questionId <= 0) {
			return res.status(400).json({ error: "invalid question id" });
		}

		const raw = req.body || {};
		let targetField: string | undefined;

		if (typeof raw.field === "string") {
			targetField = raw.field;
		} else {
			const matchedFields = QUESTION_MULTIPLE_MEDIA_FIELDS.filter((field) =>
				Object.prototype.hasOwnProperty.call(raw, field)
			);

			if (matchedFields.length > 1) {
				return res.status(400).json({
					error: "bad_request",
					detail: "send only one field to delete",
				});
			}

			targetField = matchedFields[0];
		}

		if (!targetField) {
			return res.status(400).json({
				error: "bad_request",
				detail: "field is required",
			});
		}

		const result = await hardDeleteQuestionMediaFieldByQuestionId(questionId, targetField);
		return res.json(result);
	} catch (err: any) {
		console.error("hard delete question media field error", err);
		if (err?.message) {
			return res.status(400).json({ error: "bad_request", detail: err.message });
		}
		return res.status(500).json({ error: "internal server error" });
	}
}

export async function hardDeleteChoiceMediaFieldController(req: Request, res: Response) {
	try {
		const choiceId = Number(req.params.choiceId);
		if (!Number.isInteger(choiceId) || choiceId <= 0) {
			return res.status(400).json({ error: "invalid choice id" });
		}

		const raw = req.body || {};
		let targetField: string | undefined;

		if (typeof raw.field === "string") {
			targetField = raw.field;
		} else {
			const matchedFields = CHOICE_MULTIPLE_MEDIA_FIELDS.filter((field) =>
				Object.prototype.hasOwnProperty.call(raw, field)
			);

			if (matchedFields.length > 1) {
				return res.status(400).json({
					error: "bad_request",
					detail: "send only one field to delete",
				});
			}

			targetField = matchedFields[0];
		}

		if (!targetField) {
			return res.status(400).json({
				error: "bad_request",
				detail: "field is required",
			});
		}

		const result = await hardDeleteChoiceMediaFieldByChoiceId(choiceId, targetField);
		return res.json(result);
	} catch (err: any) {
		console.error("hard delete choice media field error", err);
		if (err?.message) {
			return res.status(400).json({ error: "bad_request", detail: err.message });
		}
		return res.status(500).json({ error: "internal server error" });
	}
}