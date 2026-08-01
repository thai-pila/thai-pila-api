import { Request, Response } from "express";
import {
    createSituationQuestionMultipleWithChoices,
    CreateSituationQuestionInput,
    CreateSituationAssetInput,
    getSituationQuestionsByGameId,
    getAllSituationQuestions,
    updateSituationQuestionMultipleById,
    updateSituationChoicesByQuestionId,
    softDeleteSituationQuestionById,
    hardDeleteSituationQuestionById,
    hardDeleteSituationChoicesByIds,
    createSituationChoicesByQuestionId,
    createSituationAssetsByGameId,
    updateSituationAssetById,
    hardDeleteSituationAssetById,
    hardDeleteQuestionSituationMediaFieldByQuestionId,
    hardDeleteChoiceSituationMediaFieldByChoiceId
} from "../services/situation.service";

const QUESTION_SITUATION_MEDIA_FIELDS = [
    "sound_question",
    "image_question",
    "hint",
    "sound_hint",
    "image_hint"
] as const;

const CHOICE_SITUATION_MEDIA_FIELDS = ["sound_choice", "image_choice"] as const;

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

function parseQuestionsInput(rawQuestions: any): CreateSituationQuestionInput[] {
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

    return normalizedQuestions as CreateSituationQuestionInput[];
}

function parseSituationAssetsInput(rawBody: any): CreateSituationAssetInput[] {
    const body = rawBody || {};

    if (Object.prototype.hasOwnProperty.call(body, "assets")) {
        const parsedAssets = typeof body.assets === "string" ? JSON.parse(body.assets) : body.assets;

        if (Array.isArray(parsedAssets)) {
            return parsedAssets as CreateSituationAssetInput[];
        }

        if (parsedAssets && typeof parsedAssets === "object") {
            return [parsedAssets as CreateSituationAssetInput];
        }

        throw new Error("assets must be array or object");
    }

    if (Object.prototype.hasOwnProperty.call(body, "asset") || Object.prototype.hasOwnProperty.call(body, "position")) {
        return [{
            asset: Object.prototype.hasOwnProperty.call(body, "asset") ? body.asset : null,
            position: body.position,
        } as CreateSituationAssetInput];
    }

    throw new Error("assets is required");
}

export async function createSituationQuestionMultipleController(req: Request, res: Response) {
    try {
        const idGameInfo = Number(req.params.gameId);
        if (!Number.isInteger(idGameInfo) || idGameInfo <= 0) {
            return res.status(400).json({ error: "invalid game id" });
        }

        const questions = parseQuestionsInput(req.body?.questions);

        const created = await createSituationQuestionMultipleWithChoices(idGameInfo, questions);

        const normalized = created.map((q: any) => {
            const { id_game_info, ...rest } = q;
            return rest;
        });

        return res.status(201).json({ id_game_info: idGameInfo, questions: normalized });
    } catch (err: any) {
        console.error("createSituationQuestionMultipleController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function findSituationQuestionsByGameIdController(req: Request, res: Response) {
    try {
        const gameId = Number(req.params.gameId);
        if (!Number.isInteger(gameId) || gameId <= 0) {
            return res.status(400).json({ error: "invalid game id" });
        }
        const questions = await getSituationQuestionsByGameId(gameId);
        return res.json(questions);
    } catch (err) {
        console.error("get situation questions by game id error", err);
        return res.status(500).json({ error: "internal server error" });
    }
}

export async function findAllSituationQuestionsController(req: Request, res: Response) {
    try {
        const questions = await getAllSituationQuestions();
        return res.json(questions);
    } catch (err) {
        console.error("get all situation questions error", err);
        return res.status(500).json({ error: "internal server error" });
    }
}

export async function updateSituationQuestionMultipleController(req: Request, res: Response) {
    try {
        const questionId = Number(req.params.questionId);
        if (!Number.isInteger(questionId) || questionId <= 0) {
            return res.status(400).json({ error: "invalid question id" });
        }

        const payload: any = {};
        const raw = req.body || {};

        if (Object.prototype.hasOwnProperty.call(raw, "no")) payload.no = Number(raw.no);
        if (Object.prototype.hasOwnProperty.call(raw, "question")) payload.question = raw.question;
        if (Object.prototype.hasOwnProperty.call(raw, "question_position")) payload.question_position = raw.question_position;
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

        const updated = await updateSituationQuestionMultipleById(questionId, payload);
        return res.json(updated);
    } catch (err: any) {
        console.error("update question error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal server error" });
    }
}

export async function updateSituationChoicesByQuestionController(req: Request, res: Response) {
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

        const updated = await updateSituationChoicesByQuestionId(questionId, choices);
        return res.json({ id_question_multiple: questionId, choices: updated });
    } catch (err: any) {
        console.error("update choices by question error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal server error" });
    }
}

export async function createSituationChoicesByQuestionController(req: Request, res: Response) {
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

        const created = await createSituationChoicesByQuestionId(questionId, choices);
        return res.status(201).json({ id_question_multiple: questionId, choices: created });
    } catch (err: any) {
        console.error("create choices by question error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal server error" });
    }
}


export async function softDeleteSituationQuestionController(req: Request, res: Response) {
    try {
        const questionId = Number(req.params.questionId);
        if (!Number.isInteger(questionId) || questionId <= 0) {
            return res.status(400).json({ error: "invalid question id" });
        }

        const result = await softDeleteSituationQuestionById(questionId);
        return res.json({ id_question_multiple: questionId, ...result });
    } catch (err: any) {
        console.error("soft delete situation question error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal server error" });
    }
}

export async function hardDeleteSituationQuestionController(req: Request, res: Response) {
    try {
        const questionId = Number(req.params.questionId);
        if (!Number.isInteger(questionId) || questionId <= 0) {
            return res.status(400).json({ error: "invalid question id" });
        }

        const result = await hardDeleteSituationQuestionById(questionId);
        return res.json({ id_question_multiple: questionId, ...result });
    } catch (err: any) {
        console.error("hard delete situation question error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal server error" });
    }
}

export async function hardDeleteSituationChoicesController(req: Request, res: Response) {
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
        const result = await hardDeleteSituationChoicesByIds(questionId, choiceIds);
        return res.json(result);
    } catch (err: any) {
        console.error("hard delete multiple situation choices error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal server error" });
    }
}

export async function createSituationAssetsController(req: Request, res: Response) {
    try {
        const idGameInfo = Number(req.params.gameId);
        if (!Number.isInteger(idGameInfo) || idGameInfo <= 0) {
            return res.status(400).json({ error: "invalid game id" });
        }

        const assets = parseSituationAssetsInput(req.body);
        const created = await createSituationAssetsByGameId(idGameInfo, assets);

        const normalized = created.map((asset: any) => {
            const { id_game_info, ...rest } = asset;
            return rest;
        });

        return res.status(201).json({ id_game_info: idGameInfo, assets: normalized });
    } catch (err: any) {
        console.error("create situation assets error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal server error" });
    }
}

export async function updateSituationAssetController(req: Request, res: Response) {
    try {
        const assetId = Number(req.params.assetId);
        if (!Number.isInteger(assetId) || assetId <= 0) {
            return res.status(400).json({ error: "invalid asset id" });
        }

        const payload: any = {};
        const raw = req.body || {};

        if (Object.prototype.hasOwnProperty.call(raw, "asset")) payload.asset = raw.asset;
        if (Object.prototype.hasOwnProperty.call(raw, "position")) payload.position = raw.position;

        const updated = await updateSituationAssetById(assetId, payload);
        return res.json(updated);
    } catch (err: any) {
        console.error("update situation asset error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal server error" });
    }
}

export async function hardDeleteSituationAssetController(req: Request, res: Response) {
    try {
        const assetId = Number(req.params.assetId);
        if (!Number.isInteger(assetId) || assetId <= 0) {
            return res.status(400).json({ error: "invalid asset id" });
        }

        const deleted = await hardDeleteSituationAssetById(assetId);
        return res.json(deleted);
    } catch (err: any) {
        console.error("hard delete situation asset error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal server error" });
    }
}

export async function hardDeleteQuestionSituationMediaFieldController(req: Request, res: Response) {
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
            const matchedFields = QUESTION_SITUATION_MEDIA_FIELDS.filter((field) =>
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

        const result = await hardDeleteQuestionSituationMediaFieldByQuestionId(questionId, targetField);
        return res.json(result);
    } catch (err: any) {
        console.error("hard delete question situation media field error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal server error" });
    }
}

export async function hardDeleteChoiceSituationMediaFieldController(req: Request, res: Response) {
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
            const matchedFields = CHOICE_SITUATION_MEDIA_FIELDS.filter((field) =>
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

        const result = await hardDeleteChoiceSituationMediaFieldByChoiceId(choiceId, targetField);
        return res.json(result);
    } catch (err: any) {
        console.error("hard delete choice situation media field error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal server error" });
    }
}