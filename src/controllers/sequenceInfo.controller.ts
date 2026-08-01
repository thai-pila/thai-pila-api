import { Request, Response } from 'express';
import { 
    createSequence, 
    findSequenceById, 
    findAllSequences, 
    addGamesToSequence, 
    SequenceGameEntry, 
    findSequencesByGameId, 
    findSequenceByUuidWithGames, 
    hardDeleteGamesFromSequence, 
    findSequenceByUuidWithGameDetails, 
    softDeleteSequenceById, 
    updateExerciseNameById, 
    addGamesToSequenceByGameUuid, 
    SequenceGameUuidEntry, 
    updateSequenceStatusById, 
    hardDeleteSequenceById 
} from '../services/sequenceInfo.service';

function isValidUuid(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
}

export async function createSequenceController(req: Request, res: Response) {
    try {
        const {
            teacher_uuid,
            create_by,
            exercise_name,
            description,
            subject,
            class: className,
            group_id,
            sequence_default,
        } = req.body;

        const thumbnail = req.file
            ? `${req.file.filename}`
            : null;

        const normalizedTeacherUuid =
            teacher_uuid === undefined || teacher_uuid === null || teacher_uuid === ''
                ? null
                : String(teacher_uuid).trim();

        if (normalizedTeacherUuid && !isValidUuid(normalizedTeacherUuid)) {
            return res.status(400).json({ error: 'invalid teacher_uuid' });
        }

        const created = await createSequence({
            teacher_uuid: normalizedTeacherUuid,
            create_by,
            exercise_name,
            description,
            subject,
            thumbnail,
            class: className,
            group_id,
            sequence_default: sequence_default === true || sequence_default === 'true' ? true : false,
        });
        return res.status(201).json(created);
    }
    catch (err: any) {
        console.error('createSequence error', err);
        return res.status(500).json({ error: 'internal_server_error', detail: err?.message });
    }
}

export async function findSequenceByIdController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
        const sequenceInfo = await findSequenceById(id);
        if (!sequenceInfo) return res.status(404).json({ error: 'not found' });
        return res.json(sequenceInfo);
    }
    catch (err) {
        console.error('get sequenceInfo error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findSequenceByUuidWithGamesController(req: Request, res: Response) {
    try {
        const uuid = String(req.params.uuid || '').trim();
        if (!uuid) return res.status(400).json({ error: 'invalid uuid' });

        const result = await findSequenceByUuidWithGames(uuid);
        if (!result) return res.status(404).json({ error: 'not found' });

        return res.json(result);
    }
    catch (err) {
        console.error('get sequence by uuid with games error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findSequenceByUuidWithGameDetailsController(req: Request, res: Response) {
    try {
        const uuid = String(req.params.uuid || '').trim();
        if (!uuid) return res.status(400).json({ error: 'invalid uuid' });

        const result = await findSequenceByUuidWithGameDetails(uuid);
        if (!result) return res.status(404).json({ error: 'not found' });

        return res.json(result);
    }
    catch (err) {
        console.error('get sequence by uuid with game details error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findAllSequenceInfoController(req: Request, res: Response) {
    try {
        const sequenceInfos = await findAllSequences();
        return res.json(sequenceInfos);
    }
    catch (err) {
        console.error('get sequenceInfos error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function addGamesToSequenceController(req: Request, res: Response) {
    try {
        const payload = req.body;
        let entries: SequenceGameEntry[] = [];
    
        if (Array.isArray(payload)) {
          entries = payload;
        } else if (payload && typeof payload === 'object') {
          // single object -> wrap
          entries = [payload as SequenceGameEntry];
        } else {
          return res.status(400).json({ error: 'body must be an array or object with sequenceId and gameId' });
        }
    
        const inserted = await addGamesToSequence(entries);
        return res.status(201).json(inserted);
      } catch (err: any) {
        console.error('addGamesToSequence error', err);
        return res.status(500).json({ error: 'internal_server_error', detail: err?.message });
      }
}

export async function addGamesToSequenceByGameUuidController(req: Request, res: Response) {
    try {
        const payload = req.body;
        let entries: SequenceGameUuidEntry[] = [];

        if (Array.isArray(payload)) {
            entries = payload as SequenceGameUuidEntry[];
        } else if (payload && typeof payload === 'object') {
            entries = [payload as SequenceGameUuidEntry];
        } else {
            return res.status(400).json({ error: 'body must be an array or object with sequenceId and gameUuid' });
        }

        for (const entry of entries) {
            const sequenceId = Number((entry as any)?.sequenceId);
            const gameUuid = String((entry as any)?.gameUuid ?? '').trim();

            if (!Number.isFinite(sequenceId) || !gameUuid) {
                return res.status(400).json({ error: 'sequenceId and gameUuid are required' });
            }

            if (!isValidUuid(gameUuid)) {
                return res.status(400).json({ error: 'invalid gameUuid' });
            }
        }

        const inserted = await addGamesToSequenceByGameUuid(entries);
        return res.status(201).json(inserted);
    } catch (err: any) {
        if (err?.code === 'SEQ_GAME_UUID_ENTRIES_INVALID' || err?.code === 'SEQ_GAME_UUID_ENTRY_INVALID') {
            return res.status(400).json({ error: 'sequenceId_and_gameUuid_required' });
        }

        if (err?.code === 'SEQ_NOT_FOUND') {
            return res.status(404).json({ error: 'sequence_not_found' });
        }

        if (err?.code === 'GAME_UUID_NOT_FOUND') {
            return res.status(404).json({ error: 'game_uuid_not_found' });
        }

        console.error('addGamesToSequenceByGameUuid error', err);
        return res.status(500).json({ error: 'internal_server_error', detail: err?.message });
    }
}

export async function hardDeleteGamesFromSequenceController(req: Request, res: Response) {
    try {
        const sequenceId = Number(req.params.sequenceId);
        if (Number.isNaN(sequenceId)) {
            return res.status(400).json({ error: 'invalid sequence id' });
        }

        const body = req.body ?? {};
        const gameIdsRaw = Array.isArray(body)
            ? body
            : Array.isArray(body.gameIds)
                ? body.gameIds
                : (body.gameId !== undefined ? [body.gameId] : []);

        if (!Array.isArray(gameIdsRaw) || gameIdsRaw.length === 0) {
            return res.status(400).json({ error: 'gameId or gameIds is required' });
        }

        const gameIds = gameIdsRaw.map((value: any) => Number(value));
        if (gameIds.some((value) => Number.isNaN(value))) {
            return res.status(400).json({ error: 'all game ids must be numbers' });
        }

        const deleted = await hardDeleteGamesFromSequence(sequenceId, gameIds);
        return res.json({
            sequenceId,
            requestedGameIds: gameIds,
            deletedCount: deleted.length,
            deleted,
        });
    }
    catch (err: any) {
        console.error('hardDeleteGamesFromSequence error', err);
        return res.status(500).json({ error: 'internal_server_error', detail: err?.message });
    }
}

export async function findSequenceByGameId(req: Request, res: Response) {
     try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
        const sequenceInfo = await findSequenceById(id);
        if (!sequenceInfo) return res.status(404).json({ error: 'not found' });
        return res.json(sequenceInfo);
    }
    catch (err) {
        console.error('get sequenceInfo error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findSequenceByGameIdController(req: Request, res: Response) {
    try {
        const gameId = Number(req.params.gameId);
        if (Number.isNaN(gameId)) return res.status(400).json({ error: 'invalid game id' });
        const sequences = await findSequencesByGameId(gameId);
        return res.json(sequences);
    }
    catch (err) {
        console.error('get sequence by game id error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function softDeleteSequenceByIdController(req: Request, res: Response) {
try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'invalid id' });
        }

        const updated = await softDeleteSequenceById(id);
        if (!updated) return res.status(404).json({ error: 'not found' });

        return res.json(updated);
    } catch (err: any) {
        console.error('soft delete sequence error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function updateExerciseNameController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'invalid id' });
        }

        const payload: any = {};
        const raw = req.body || {};

        if (Object.prototype.hasOwnProperty.call(raw, "exercise_name")) {
            payload.exercise_name = raw.exercise_name;
        }

        if (Object.prototype.hasOwnProperty.call(raw, "sequence_default")) {
            const value = raw.sequence_default;
            if (value === true || value === 'true') {
                payload.sequence_default = true;
            } else if (value === false || value === 'false') {
                payload.sequence_default = false;
            } else {
                return res.status(400).json({ error: 'invalid sequence_default' });
            }
        }
        
        if (Object.keys(payload).length === 0) {
            return res.status(400).json({ error: 'no updatable fields provided' });
        }

        const updated = await updateExerciseNameById(id, payload);
        if (!updated) return res.status(404).json({ error: 'not found' });
        
        return res.json(updated);
    } catch (err: any) {
        console.error('update exercise name error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function updateSequenceStatusController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'invalid id' });
        }

        const raw = req.body?.status;
        if (raw === undefined) {
            return res.status(400).json({ error: 'status_required' });
        }

        const status = raw === true || raw === 'true' || raw === '1' ? true : false;

        const updated = await updateSequenceStatusById(id, status);
        return res.json(updated);
    } catch (err: any) {
        console.error('update sequence status error', err);
        if (err?.message === 'not found') {
            return res.status(404).json({ error: 'not found' });
        }
        if (err?.message) {
            return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function hardDeleteSequenceByIdController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'invalid id' });
        }
        const deleted = await hardDeleteSequenceById(id);
        if (!deleted) return res.status(404).json({ error: 'not found' });
        return res.json(deleted);
    } catch (err: any) {
        console.error('hard delete sequence error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}
        