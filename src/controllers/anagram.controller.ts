import { Request, Response } from "express";
import { 
	CreateAnagramInput,
	createAnagramByGameId,
	getAnagramsByGameId,
	getAllAnagrams,
	updateAnagramById,
	softDeleteAnagramById,
	hardDeleteAnagramById,
    hardDeleteAnagramMediaFieldById,
} from "../services/anagram.service";

const ANAGRAM_MEDIA_FIELDS = [
    "sound_word",
    "sound_swap_word",
    "image_word",
    "image_swap_word",
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

function parseAnagramsInput(rawBody: any): CreateAnagramInput[] {
    const body = rawBody || {};
    const rawAnagrams = body.anagrams;
    if (!rawAnagrams) {
        throw new Error("anagrams is required");
    }

    const parsed = typeof rawAnagrams === "string" ? JSON.parse(rawAnagrams) : rawAnagrams;
    if (!Array.isArray(parsed)) {
        throw new Error("anagrams must be array");
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

    return normalized as CreateAnagramInput[];
}

export async function createAnagramController(req: Request, res: Response) {
    try {
        const idGameInfo = Number(req.params.gameId);
        if (!Number.isInteger(idGameInfo) || idGameInfo <= 0) {
            return res.status(400).json({ error: "invalid game id" });
        }

        const anagrams = parseAnagramsInput(req.body);
        const created = await createAnagramByGameId(idGameInfo, anagrams);

        const normalized = created.map((item: any) => {
            const { id_game_info, ...rest } = item;
            return rest;
        });

        return res.status(201).json({ id_game_info: idGameInfo, anagrams: normalized });
    } catch (err: any) {
        console.error("createAnagramController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function findAnagramsByGameIdController(req: Request, res: Response) {
    try {
        const gameId = Number(req.params.gameId);
        if (!Number.isInteger(gameId) || gameId <= 0) {
            return res.status(400).json({ error: "invalid game id" });
        }

        const anagrams = await getAnagramsByGameId(gameId);
        return res.json(anagrams);
    } catch (err: any) {
        console.error("findAnagramsByGameIdController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function findAllAnagramsController(req: Request, res: Response) {
    try {
        const anagrams = await getAllAnagrams();
        return res.json(anagrams);
    } catch (err: any) {
        console.error("findAllAnagramsController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function updateAnagramController(req: Request, res: Response) {
    try {
        const anagramId = Number(req.params.anagramId);
        if (!Number.isInteger(anagramId) || anagramId <= 0) {
            return res.status(400).json({ error: "invalid anagram id" });
        }

        const payload: any = {};
        const raw = req.body || {};

        if (Object.prototype.hasOwnProperty.call(raw, "no")) payload.no = Number(raw.no);
        if (Object.prototype.hasOwnProperty.call(raw, "word")) payload.word = raw.word;
        if (Object.prototype.hasOwnProperty.call(raw, "swap_word")) payload.swap_word = raw.swap_word;
        if (Object.prototype.hasOwnProperty.call(raw, "hint")) payload.hint = raw.hint;
        if (Object.prototype.hasOwnProperty.call(raw, "sound_word")) payload.sound_word = raw.sound_word;
        if (Object.prototype.hasOwnProperty.call(raw, "image_word")) payload.image_word = raw.image_word;
        if (Object.prototype.hasOwnProperty.call(raw, "sound_hint")) payload.sound_hint = raw.sound_hint;
        if (Object.prototype.hasOwnProperty.call(raw, "image_hint")) payload.image_hint = raw.image_hint;
        if (Object.prototype.hasOwnProperty.call(raw, "sound_swap_word")) payload.sound_swap_word = raw.sound_swap_word;
        if (Object.prototype.hasOwnProperty.call(raw, "image_swap_word")) payload.image_swap_word = raw.image_swap_word;
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

        const updated = await updateAnagramById(anagramId, payload);
        return res.json(updated);
    } catch (err: any) {
        console.error("updateAnagramController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function softDeleteAnagramController(req: Request, res: Response) {
    try {
        const anagramId = Number(req.params.anagramId);
        if (!Number.isInteger(anagramId) || anagramId <= 0) {
            return res.status(400).json({ error: "invalid anagram id" });
        }

        const result = await softDeleteAnagramById(anagramId);
        return res.json({ id_anagram: anagramId, ...result });
    } catch (err: any) {
        console.error("softDeleteAnagramController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function hardDeleteAnagramController(req: Request, res: Response) {
    try {
        const anagramId = Number(req.params.anagramId);
        if (!Number.isInteger(anagramId) || anagramId <= 0) {
            return res.status(400).json({ error: "invalid anagram id" });
        }

        const result = await hardDeleteAnagramById(anagramId);
        return res.json({ id_anagram: anagramId, ...result });
    } catch (err: any) {
        console.error("hardDeleteAnagramController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}

export async function hardDeleteAnagramMediaFieldController(req: Request, res: Response) {
    try {
        const anagramId = Number(req.params.anagramId);
        if (!Number.isInteger(anagramId) || anagramId <= 0) {
            return res.status(400).json({ error: "invalid anagram id" });
        }

        const raw = req.body || {};
        let targetField: string | undefined;

        if (typeof raw.field === "string") {
            targetField = raw.field;
        } else {
            const matchedFields = ANAGRAM_MEDIA_FIELDS.filter((field) =>
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

        const result = await hardDeleteAnagramMediaFieldById(anagramId, targetField);
        return res.json({ id_anagram: anagramId, ...result });
    } catch (err: any) {
        console.error("hardDeleteAnagramMediaFieldController error", err);
        if (err?.message) {
            return res.status(400).json({ error: "bad_request", detail: err.message });
        }
        return res.status(500).json({ error: "internal_server_error" });
    }
}
