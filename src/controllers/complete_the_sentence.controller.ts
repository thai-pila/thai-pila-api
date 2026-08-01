import { Request, Response } from "express";
import {
    CreateCompleteTheSentenceInput,
    createCompleteTheSentenceByGameId,
    getCompleteTheSentenceByGameId,
    getAllCompleteTheSentences,
    updateCompleteTheSentenceById,
    softDeleteCompleteTheSentenceById,
    hardDeleteCompleteTheSentenceById,
    hardDeleteCompleteTheSentenceMediaFieldById
} from "../services/complete_the_sentence.service";

const COMPLETE_THE_SENTENCE_MEDIA_FIELDS = [
    "sound_question",
    "image_question",
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

function parseCompleteTheSentencesInput(rawBody: any): CreateCompleteTheSentenceInput[] {
    const body = rawBody || {};
    const rawCompleteTheSentences = body.complete_the_sentences;
    if (!rawCompleteTheSentences) {
        throw new Error("complete_the_sentences is required");
    }

    const parsed = typeof rawCompleteTheSentences === "string" ? JSON.parse(rawCompleteTheSentences) : rawCompleteTheSentences;
    if (!Array.isArray(parsed)) {
        throw new Error("complete_the_sentences must be array");
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

    return normalized as CreateCompleteTheSentenceInput[];
}

export async function createCompleteTheSentenceController(req: Request, res: Response) {
    try {
        const idGameInfo = Number(req.params.gameId);
        if (!Number.isInteger(idGameInfo) || idGameInfo <= 0) {
            return res.status(400).json({ error: "invalid game id" });
        }

        const completeTheSentences = parseCompleteTheSentencesInput(req.body);
        const created = await createCompleteTheSentenceByGameId(idGameInfo, completeTheSentences);

        const normalized = created.map((item: any) => {
            const { id_game_info, ...rest } = item;
            return rest;
        });

        return res.status(201).json({ id_game_info: idGameInfo, complete_the_sentences: normalized });
    } catch (err: any) {
        console.error("createCompleteTheSentenceController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function findCompleteTheSentencesByGameIdController(req: Request, res: Response) {
    try {
        const gameId = Number(req.params.gameId);
        if (!Number.isInteger(gameId) || gameId <= 0) {
            return res.status(400).json({ error: "invalid game id" });
        }

        const completeTheSentences = await getCompleteTheSentenceByGameId(gameId);
        return res.json(completeTheSentences);
    } catch (err: any) {
        console.error("findCompleteTheSentencesByGameIdController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function findAllCompleteTheSentencesController(req: Request, res: Response) {
    try {
        const completeTheSentences = await getAllCompleteTheSentences();
        return res.json(completeTheSentences);
    } catch (err: any) {
        console.error("findAllCompleteTheSentencesController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function updateCompleteTheSentenceController(req: Request, res: Response) {
    try {
        const completeTheSentenceId = Number(req.params.completeTheSentenceId);
        if (!Number.isInteger(completeTheSentenceId) || completeTheSentenceId <= 0) {
            return res.status(400).json({ error: "invalid complete the sentence id" });
        }

        const payload: any = {};
        const raw = req.body || {};

        if (Object.prototype.hasOwnProperty.call(raw, "no")) payload.no = Number(raw.no);
        if (Object.prototype.hasOwnProperty.call(raw, "question_answer")) payload.question_answer = raw.question_answer;
        if (Object.prototype.hasOwnProperty.call(raw, "hint")) payload.hint = raw.hint;
        if (Object.prototype.hasOwnProperty.call(raw, "sound_question_answer")) payload.sound_question_answer = raw.sound_question_answer;
        if (Object.prototype.hasOwnProperty.call(raw, "image_question_answer")) payload.image_question_answer = raw.image_question_answer;
        if (Object.prototype.hasOwnProperty.call(raw, "sound_hint")) payload.sound_hint = raw.sound_hint;
        if (Object.prototype.hasOwnProperty.call(raw, "image_hint")) payload.image_hint = raw.image_hint;
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

        const updated = await updateCompleteTheSentenceById(completeTheSentenceId, payload);
        return res.json(updated);
    } catch (err: any) {
        console.error("updateCompleteTheSentenceController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function softDeleteCompleteTheSentenceController(req: Request, res: Response) {
    try {
        const completeTheSentenceId = Number(req.params.completeTheSentenceId);
        if (!Number.isInteger(completeTheSentenceId) || completeTheSentenceId <= 0) {
            return res.status(400).json({ error: "invalid complete the sentence id" });
        }

        const result = await softDeleteCompleteTheSentenceById(completeTheSentenceId);
        return res.json({ id_complete_the_sentence: completeTheSentenceId, ...result });
    } catch (err: any) {
        console.error("softDeleteCompleteTheSentenceController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function hardDeleteCompleteTheSentenceController(req: Request, res: Response) {
    try {
        const completeTheSentenceId = Number(req.params.completeTheSentenceId);
        if (!Number.isInteger(completeTheSentenceId) || completeTheSentenceId <= 0) {
            return res.status(400).json({ error: "invalid complete the sentence id" });
        }

        const result = await hardDeleteCompleteTheSentenceById(completeTheSentenceId);
        return res.json({ id_complete_the_sentence: completeTheSentenceId, ...result });
    } catch (err: any) {
        console.error("hardDeleteCompleteTheSentenceController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function hardDeleteCompleteTheSentenceMediaFieldController(req: Request, res: Response) {
    try {
        const completeTheSentenceId = Number(req.params.completeTheSentenceId);
        if (!Number.isInteger(completeTheSentenceId) || completeTheSentenceId <= 0) {
            return res.status(400).json({ error: "invalid complete the sentence id" });
        }

        const raw = req.body || {};
        let targetField: string | undefined;

        if (typeof raw.field === "string") {
            targetField = raw.field;
        } else {
            const matchedFields = COMPLETE_THE_SENTENCE_MEDIA_FIELDS.filter((field) =>
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

        const result = await hardDeleteCompleteTheSentenceMediaFieldById(completeTheSentenceId, targetField);
        return res.json({ id_complete_the_sentence: completeTheSentenceId, ...result });
    } catch (err: any) {
        console.error("hardDeleteCompleteTheSentenceMediaFieldController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}