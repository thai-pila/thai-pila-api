import { Request, Response } from "express";
import {
    CreateCorrectAnswerInput,
    createCorrectAnswerByGameId,
    getCorrectAnswersByGameId,
    getAllCorrectAnswers,
    updateCorrectAnswerById,
    softDeleteCorrectAnswerById,
    hardDeleteCorrectAnswerById,
    hardDeleteCorrectAnswerMediaFieldById
} from "../services/correct_answer.service";

const CORRECT_ANSWER_MEDIA_FIELDS = [
    "sound_correct_answer",
    "sound_wrong_answer",
    "image_correct_answer",
    "image_wrong_answer",
    "hint",
    "sound_hint",
    "image_hint"
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

function parseCorrectAnswersInput(rawBody: any): CreateCorrectAnswerInput[] {
    const body = rawBody || {};
    const rawCorrectAnswers = body.correctAnswers;
    if (!rawCorrectAnswers) {
        throw new Error("correctAnswers is required");
    }

    const parsed = typeof rawCorrectAnswers === "string" ? JSON.parse(rawCorrectAnswers) : rawCorrectAnswers;
    if (!Array.isArray(parsed)) {
        throw new Error("correctAnswers must be array");
    }

    const parsedSkillListeningSpeaking = parseOptionalBoolean(body.skill_listening_speaking);
    const parsedSkillLangNature = parseOptionalBoolean(body.skill_lang_nature);
    const parsedSkillReading = parseOptionalBoolean(body.skill_reading);
    const parsedSkillWriting = parseOptionalBoolean(body.skill_writing);
    const parsedAudioQuestion = parseOptionalBoolean(body.audio_question);
    const parsedAudioChoice = parseOptionalBoolean(body.audio_choice);
    const parsedAudioAssistantVoice = parseOptionalBoolean(body.audio_assistant_voice);
    const parsedAudioBackground = parseOptionalBoolean(body.audio_background);

    const hasGameLevelSkills =
        Object.prototype.hasOwnProperty.call(body, "skill_listening_speaking") ||
        Object.prototype.hasOwnProperty.call(body, "skill_lang_nature") ||
        Object.prototype.hasOwnProperty.call(body, "skill_reading") ||
        Object.prototype.hasOwnProperty.call(body, "skill_writing");

    const hasGameLevelAudio =
        Object.prototype.hasOwnProperty.call(body, "audio_question") ||
        Object.prototype.hasOwnProperty.call(body, "audio_choice") ||
        Object.prototype.hasOwnProperty.call(body, "audio_assistant_voice") ||
        Object.prototype.hasOwnProperty.call(body, "audio_background");

    const normalized = parsed.map((item: any) => {
        const row: any = { ...item };

        if (hasGameLevelSkills) {
            if (Object.prototype.hasOwnProperty.call(body, "skill_listening_speaking")) {
                row.skill_listening_speaking = parsedSkillListeningSpeaking === undefined ? body.skill_listening_speaking : parsedSkillListeningSpeaking;
            }
            if (Object.prototype.hasOwnProperty.call(body, "skill_lang_nature")) {
                row.skill_lang_nature = parsedSkillLangNature === undefined ? body.skill_lang_nature : parsedSkillLangNature;
            }
            if (Object.prototype.hasOwnProperty.call(body, "skill_reading")) {
                row.skill_reading = parsedSkillReading === undefined ? body.skill_reading : parsedSkillReading;
            }
            if (Object.prototype.hasOwnProperty.call(body, "skill_writing")) {
                row.skill_writing = parsedSkillWriting === undefined ? body.skill_writing : parsedSkillWriting;
            }
        }

        if (hasGameLevelAudio) {
            if (Object.prototype.hasOwnProperty.call(body, "audio_question")) {
                row.audio_question = parsedAudioQuestion === undefined ? body.audio_question : parsedAudioQuestion;
            }
            if (Object.prototype.hasOwnProperty.call(body, "audio_choice")) {
                row.audio_choice = parsedAudioChoice === undefined ? body.audio_choice : parsedAudioChoice;
            }
            if (Object.prototype.hasOwnProperty.call(body, "audio_assistant_voice")) {
                row.audio_assistant_voice = parsedAudioAssistantVoice === undefined ? body.audio_assistant_voice : parsedAudioAssistantVoice;
            }
            if (Object.prototype.hasOwnProperty.call(body, "audio_background")) {
                row.audio_background = parsedAudioBackground === undefined ? body.audio_background : parsedAudioBackground;
            }
        }

        return row;
    });

    return normalized as CreateCorrectAnswerInput[];
}

export async function createCorrectAnswerController(req: Request, res: Response) {
    try {
        const idGameInfo = Number(req.params.gameId);
        if (!Number.isInteger(idGameInfo) || idGameInfo <= 0) {
            return res.status(400).json({ error: "invalid game id" });
        }

        const correctAnswers = parseCorrectAnswersInput(req.body);
        const created = await createCorrectAnswerByGameId(idGameInfo, correctAnswers);

        const normalized = created.map((item: any) => {
            const { id_game_info, ...rest } = item;
            return rest;
        });

        return res.status(201).json({ id_game_info: idGameInfo, correctAnswers: normalized });
    } catch (err: any) {
        console.error("createCorrectAnswerController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function findCorrectAnswersByGameIdController(req: Request, res: Response) {
    try {
        const gameId = Number(req.params.gameId);
        if (!Number.isInteger(gameId) || gameId <= 0) {
            return res.status(400).json({ error: "invalid game id" });
        }

        const correctAnswers = await getCorrectAnswersByGameId(gameId);
        return res.json(correctAnswers);
    } catch (err: any) {
        console.error("findCorrectAnswersByGameIdController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function findAllCorrectAnswersController(req: Request, res: Response) {
    try {
        const correctAnswers = await getAllCorrectAnswers();
        return res.json(correctAnswers);
    } catch (err: any) {
        console.error("findAllCorrectAnswersController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function updateCorrectAnswerController(req: Request, res: Response) {
    try {
        const correctAnswerId = Number(req.params.correctAnswerId);
        if (!Number.isInteger(correctAnswerId) || correctAnswerId <= 0) {
            return res.status(400).json({ error: "invalid correct answer id" });
        }

        const payload: any = {};
        const raw = req.body || {};

        if (Object.prototype.hasOwnProperty.call(raw, "no")) payload.no = Number(raw.no);
        if (Object.prototype.hasOwnProperty.call(raw, "correct_answer")) payload.correct_answer = raw.correct_answer;
        if (Object.prototype.hasOwnProperty.call(raw, "wrong_answer")) payload.wrong_answer = raw.wrong_answer;
        if (Object.prototype.hasOwnProperty.call(raw, "hint")) payload.hint = raw.hint;
        if (Object.prototype.hasOwnProperty.call(raw, "sound_correct_answer")) payload.sound_correct_answer = raw.sound_correct_answer;
        if (Object.prototype.hasOwnProperty.call(raw, "image_correct_answer")) payload.image_correct_answer = raw.image_correct_answer;
        if (Object.prototype.hasOwnProperty.call(raw, "sound_hint")) payload.sound_hint = raw.sound_hint;
        if (Object.prototype.hasOwnProperty.call(raw, "image_hint")) payload.image_hint = raw.image_hint;
        if (Object.prototype.hasOwnProperty.call(raw, "sound_wrong_answer")) payload.sound_wrong_answer = raw.sound_wrong_answer;
        if (Object.prototype.hasOwnProperty.call(raw, "image_wrong_answer")) payload.image_wrong_answer = raw.image_wrong_answer;
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

        const updated = await updateCorrectAnswerById(correctAnswerId, payload);
        return res.json(updated);
    } catch (err: any) {
        console.error("updateCorrectAnswerController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function softDeleteCorrectAnswerController(req: Request, res: Response) {
    try {
        const correctAnswerId = Number(req.params.correctAnswerId);
        if (!Number.isInteger(correctAnswerId) || correctAnswerId <= 0) {
            return res.status(400).json({ error: "invalid correct answer id" });
        }

        const result = await softDeleteCorrectAnswerById(correctAnswerId);
        return res.json({ id_correct_answer: correctAnswerId, ...result });
    } catch (err: any) {
        console.error("softDeleteCorrectAnswerController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function hardDeleteCorrectAnswerController(req: Request, res: Response) {
    try {
        const correctAnswerId = Number(req.params.correctAnswerId);
        if (!Number.isInteger(correctAnswerId) || correctAnswerId <= 0) {
            return res.status(400).json({ error: "invalid correct answer id" });
        }

        const result = await hardDeleteCorrectAnswerById(correctAnswerId);
        return res.json({ id_correct_answer: correctAnswerId, ...result });
    } catch (err: any) {
        console.error("hardDeleteCorrectAnswerController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function hardDeleteCorrectAnswerMediaFieldController(req: Request, res: Response) {
    try {
        const correctAnswerId = Number(req.params.correctAnswerId);
        if (!Number.isInteger(correctAnswerId) || correctAnswerId <= 0) {
            return res.status(400).json({ error: "invalid correct answer id" });
        }

        const raw = req.body || {};
        let targetField: string | undefined;

        if (typeof raw.field === "string") {
            targetField = raw.field;
        } else {
            const matchedFields = CORRECT_ANSWER_MEDIA_FIELDS.filter((field) =>
                Object.prototype.hasOwnProperty.call(raw, field)
            );

            if (matchedFields.length > 1) {
                return res.status(400).json({
                    error: "bad_request",
                    detail: "send only one field to delete"
                });
            }

            targetField = matchedFields[0];
        }

        if (!targetField) {
            return res.status(400).json({
                error: "bad_request",
                detail: "field is required"
            });
        }

        const result = await hardDeleteCorrectAnswerMediaFieldById(correctAnswerId, targetField);
        return res.json({ id_correct_answer: correctAnswerId, ...result });
    } catch (err: any) {
        console.error("hardDeleteCorrectAnswerMediaFieldController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}
