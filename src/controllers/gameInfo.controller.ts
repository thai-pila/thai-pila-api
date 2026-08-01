import { Request, Response } from 'express';
import { 
    createGame, 
    findGameById, 
    findAllGames, 
    findGamesbySequenceId, 
    findAllQuestionCategories, 
    updateExerciseNameAndSuggestionById, 
    updateOtherImageById, 
    hardDeleteOtherImageById, 
    findGameInfoByUuidWithQuestions, 
    softDeleteGameInfoById, 
    generateUUIDForPila, 
    getSwapOptionsByGameType, 
    cloneGameTemplateBySourceUuid, 
    cloneGameTemplateBySourceUuidWithGameType,
    findAllCreateByByTeacherUuid, 
    updateGameStatusById, 
    hardDeleteGameInfoById,
    softDeleteBanGameInfoById,
    restoreBanGameInfoById,
    updateGameTypeByGameUuid,
    updateThumbnailByGameUuid,
    updateSubjectByGameUuid,
    updateGroupIdByGameUuid,
    findAllGamesByPlayCountDesc,
    findAllGamesExceptGameDefaultByPlayCountDesc,
    countAllGamesExceptGameDefault,
    getAllUserCreatedGameLogs,
    getAllGameTypePopularCreateGameRanking,
    getLiveDashboardGamesCapacityAverage,
    getLiveDashboardCapacityByGameUuid,
} from '../services/gameInfo.service';

function withUploadPrefix(value: string | null | undefined): string | null | undefined {
    if (!value) return value;
    if (value.startsWith('/upload/')) return value;
    return `/upload/${value}`;
}

function isValidUuid(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
}


export async function createGameInfoController(req: Request, res: Response) {
    try {
        const {
            teacher_uuid,
            teacher_name,
            create_by,
            exercise_name,
            description,
            subject,
            class: className,
            question_type,
            game_type,
            group_id,
            game_default,
        } = req.body;

        const thumbnail = req.file
            ? `${req.file.filename}`
            : null;

        if (!question_type || question_type !== 'single_question') {
            return res.status(400).json({ error: "question_type must be 'single_question'" });
        }

        if (!(teacher_name || create_by) || !exercise_name) {
            return res.status(400).json({ error: 'teacher_name (or create_by) and exercise_name are required' });
        }

        const normalizedTeacherUuid =
            teacher_uuid === undefined || teacher_uuid === null || teacher_uuid === ''
                ? null
                : String(teacher_uuid).trim();

        if (normalizedTeacherUuid && !isValidUuid(normalizedTeacherUuid)) {
            return res.status(400).json({ error: 'invalid teacher_uuid' });
        }

        const created = await createGame({
            teacher_uuid: normalizedTeacherUuid,
            teacher_name,
            create_by,
            exercise_name,
            description,
            subject,
            class: className,
            question_type,
            game_type,
            thumbnail,
            group_id,
            game_default: game_default === true || game_default === 'true' ? true : false,
        });
        const responsePayload = {
            ...created,
            thumbnail: withUploadPrefix(created?.thumbnail),
        };
        return res.status(201).json(responsePayload);
    }
    catch (err: any) {
        console.error('createGameInfo error', err);
        return res.status(500).json({ error: 'internal_server_error', detail: err?.message });
    }
}

export async function findGameInfoByIdController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
        const gameInfo = await findGameById(id);
        if (!gameInfo) return res.status(404).json({ error: 'not found' });
        return res.json(gameInfo);
    }
    catch (err) {
        console.error('get gameInfo error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findAllGameInfoController(req: Request, res: Response) {
    try {
        const gameInfos = await findAllGames();
        return res.json(gameInfos);
    }
    catch (err) {
        console.error('get gameInfos error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findGamesBySequenceIdController(req: Request, res: Response) {
    try {
        const sequenceId = Number(req.params.sequenceId);
        if (Number.isNaN(sequenceId)) return res.status(400).json({ error: 'invalid sequence id' });
        const games = await findGamesbySequenceId(sequenceId);
        return res.json(games);
    }
    catch (err) {
        console.error('get games by sequence id error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findAllQuestionCategoriesController(req: Request, res: Response) {
    try {
        const categories = await findAllQuestionCategories();
        return res.json(categories);
    }
    catch (err) {
        console.error('get question categories error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findAllCreateByByTeacherUuidController(req: Request, res: Response) {
    try {
        const teacher_uuid = String(req.params.teacher_uuid || '').trim();
        if (!teacher_uuid || !isValidUuid(teacher_uuid)) {
            return res.status(400).json({ error: 'invalid teacher_uuid' });
        }

        const data = await findAllCreateByByTeacherUuid(teacher_uuid);
        return res.json(data);
    }
    catch (err) {
        console.error('get create_by by teacher_uuid error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function updateExerciseNameAndSuggestionController(req: Request, res: Response) {
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
        if (Object.prototype.hasOwnProperty.call(raw, "suggestion")) {
            payload.suggestion = raw.suggestion;
        }
        if (Object.prototype.hasOwnProperty.call(raw, "description")) {
            payload.description = raw.description;
        }

        if (Object.keys(payload).length === 0) {
            return res.status(400).json({ error: 'no updatable fields provided' });
        }

        const updated = await updateExerciseNameAndSuggestionById(id, payload);
        if (!updated) return res.status(404).json({ error: 'not found' });
        
        return res.json(updated);
    } catch (err: any) {
        console.error('update exercise name and suggestion error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function updateOtherImageController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'invalid id' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'no file uploaded' });
        }

        const filename = `${req.file.filename}`;
        const updated = await updateOtherImageById(id, filename);
        if (!updated) return res.status(404).json({ error: 'not found' });

        const responsePayload = {
            ...updated,
            other_image: withUploadPrefix(updated?.other_image),
        };

        return res.json(responsePayload);
    } catch (err: any) {
        console.error('update other_image error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function hardDeleteOtherImageController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'invalid id' });
        }

        const updated = await hardDeleteOtherImageById(id);
        if (!updated) return res.status(404).json({ error: 'not found' });

        return res.json(updated);
    } catch (err: any) {
        console.error('hard delete other_image error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findGameInfoByUuidController(req: Request, res: Response) {
    try {
        const uuid = String(req.params.uuid || "").trim();
        if (!uuid) {
            return res.status(400).json({ error: 'invalid uuid' });
        }

        const data = await findGameInfoByUuidWithQuestions(uuid);
        if (!data) return res.status(404).json({ error: 'not found' });

        return res.json(data);
    }
    catch (err) {
        console.error('get gameInfo by uuid error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function softDeleteGameInfoController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'invalid id' });
        }

        const updated = await softDeleteGameInfoById(id);
        if (!updated) return res.status(404).json({ error: 'not found' });

        return res.json(updated);
    } catch (err: any) {
        console.error('soft delete gameInfo error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function generateUUIDForPilaController(req: Request, res: Response) {
    try {
        const uuid_gameinfo = String(req.body?.uuid_gameinfo || '').trim();
        const uuid_sequenceinfo = String(req.body?.uuid_sequenceinfo || '').trim();
        const teacher_uuid_raw = req.body?.teacher_uuid;
        const teacher_uuid =
            teacher_uuid_raw === undefined || teacher_uuid_raw === null || teacher_uuid_raw === ''
                ? undefined
                : String(teacher_uuid_raw).trim();

        if (uuid_gameinfo && uuid_sequenceinfo) {
            return res.status(400).json({ error: 'provide_only_one_of_uuid_gameinfo_or_uuid_sequenceinfo' });
        }

        if (!uuid_gameinfo && !uuid_sequenceinfo) {
            return res.status(400).json({ error: 'uuid_gameinfo_or_uuid_sequenceinfo_required' });
        }

        if (uuid_gameinfo && !isValidUuid(uuid_gameinfo)) {
            return res.status(400).json({ error: 'invalid uuid_gameinfo' });
        }

        if (uuid_sequenceinfo && !isValidUuid(uuid_sequenceinfo)) {
            return res.status(400).json({ error: 'invalid uuid_sequenceinfo' });
        }

        if (teacher_uuid && !isValidUuid(teacher_uuid)) {
            return res.status(400).json({ error: 'invalid teacher_uuid' });
        }

        const created = await generateUUIDForPila({
            uuid_gameinfo: uuid_gameinfo || undefined,
            uuid_sequenceinfo: uuid_sequenceinfo || undefined,
            teacher_uuid,
        });
        return res.status(201).json(created);
    } catch (err: any) {
        if (err?.code === 'PILA_INVALID_INPUT') {
            return res.status(400).json({ error: 'uuid_gameinfo_or_uuid_sequenceinfo_required' });
        }

        if (err?.code === '23503') {
            const detail = String(err?.detail || '');
            if (detail.includes('teacher_uuid')) {
                return res.status(404).json({ error: 'teacher_uuid_not_found' });
            }
            if (detail.includes('uuid_sequenceinfo')) {
                return res.status(404).json({ error: 'sequence_info_uuid_not_found' });
            }
            return res.status(404).json({ error: 'game_info_uuid_not_found' });
        }

        console.error('generate uuid_for_pila error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function getGameSwapOptionsController(req: Request, res: Response) {
    try {
        const gameType = req.query?.game_type;
        const result = getSwapOptionsByGameType(gameType);
        return res.json(result);
    } catch (err: any) {
        if (err?.code === 'SWAP_GAME_TYPE_REQUIRED') {
            return res.status(400).json({ error: 'game_type_required' });
        }

        if (err?.code === 'SWAP_INVALID_GAME_TYPE') {
            return res.status(400).json({ error: 'invalid_game_type' });
        }

        console.error('get game swap options error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function cloneGameTemplateController(req: Request, res: Response) {
    try {
        const sourceUuid = String(req.body?.source_uuid || '').trim();
        const teacherUuid = String(req.body?.teacher_uuid || '').trim();

        if (!teacherUuid) {
            return res.status(400).json({ error: 'teacher_uuid_required' });
        }

        if (!isValidUuid(teacherUuid)) {
            return res.status(400).json({ error: 'invalid_teacher_uuid' });
        }

        const cloned = await cloneGameTemplateBySourceUuid(sourceUuid, teacherUuid);
        return res.status(201).json(cloned);
    } catch (err: any) {
        if (err?.code === 'CLONE_TEACHER_UUID_REQUIRED') {
            return res.status(400).json({ error: 'teacher_uuid_required' });
        }

        if (err?.code === 'CLONE_SOURCE_UUID_REQUIRED') {
            return res.status(400).json({ error: 'source_uuid_required' });
        }

        if (err?.code === 'CLONE_SOURCE_GAME_NOT_FOUND') {
            return res.status(404).json({ error: 'source_game_not_found' });
        }

        if (err?.code === 'CLONE_SEQUENCE_NOT_SUPPORTED') {
            return res.status(400).json({ error: 'source_uuid_sequence_not_supported' });
        }

        if (err?.code === 'CLONE_UNSUPPORTED_GAME_TYPE') {
            return res.status(400).json({ error: 'unsupported_game_type' });
        }

        console.error('clone game template error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function cloneGameTemplateWithGameTypeController(req: Request, res: Response) {
    try {
        const sourceUuid = String(req.body?.source_uuid || '').trim();
        const teacherUuid = String(req.body?.teacher_uuid || '').trim();
        const gameType = String(req.body?.game_type || '').trim();

        if (!teacherUuid) {
            return res.status(400).json({ error: 'teacher_uuid_required' });
        }

        if (!isValidUuid(teacherUuid)) {
            return res.status(400).json({ error: 'invalid_teacher_uuid' });
        }

        if (!gameType) {
            return res.status(400).json({ error: 'game_type_required' });
        }

        const allowedGameTypes = [
            'find_the_match',
            'game_show_quiz',
            'flip_cards',
            'air_plan/flying_fruits',
            'flappy_bird',
            'whack_a_mole',
            'anagram',
            'situation',
            'complete_the_sentence',
        ] as const;

        if (!allowedGameTypes.some((item) => item === gameType)) {
            return res.status(400).json({ error: 'invalid_game_type' });
        }

        const cloned = await cloneGameTemplateBySourceUuidWithGameType(
            sourceUuid,
            teacherUuid,
            gameType as (typeof allowedGameTypes)[number]
        );

        return res.status(201).json(cloned);
    } catch (err: any) {
        if (err?.code === 'CLONE_TEACHER_UUID_REQUIRED') {
            return res.status(400).json({ error: 'teacher_uuid_required' });
        }

        if (err?.code === 'CLONE_SOURCE_UUID_REQUIRED') {
            return res.status(400).json({ error: 'source_uuid_required' });
        }

        if (err?.code === 'CLONE_SOURCE_GAME_NOT_FOUND') {
            return res.status(404).json({ error: 'source_game_not_found' });
        }

        if (err?.code === 'CLONE_SEQUENCE_NOT_SUPPORTED') {
            return res.status(400).json({ error: 'source_uuid_sequence_not_supported' });
        }

        if (err?.code === 'CLONE_UNSUPPORTED_GAME_TYPE') {
            return res.status(400).json({ error: 'unsupported_game_type' });
        }

        if (err?.code === 'CLONE_INVALID_TARGET_GAME_TYPE') {
            return res.status(400).json({ error: 'invalid_game_type' });
        }

        if (err?.code === 'CLONE_UPDATE_GAME_TYPE_FAILED') {
            return res.status(500).json({ error: 'update_cloned_game_type_failed' });
        }

        console.error('clone game template with game_type error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function updateGameStatusController(req: Request, res: Response) {
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

        const updated = await updateGameStatusById(id, status);
        return res.json(updated);
    } catch (err: any) {
        console.error('update game status error', err);
        if (err?.message === 'not found') {
            return res.status(404).json({ error: 'not found' });
        }
        if (err?.message) {
            return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function hardDeleteGameInfoController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'invalid id' });
        }
        const deleted = await hardDeleteGameInfoById(id);
        if (!deleted) return res.status(404).json({ error: 'not found' });
        return res.json(deleted);
    } catch (err: any) {
        console.error('hard delete gameInfo error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function softDeleteBanGameInfoController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'invalid id' });
        }

        const updated = await softDeleteBanGameInfoById(id);
        if (!updated) return res.status(404).json({ error: 'not found' });

        return res.json(updated);
    } catch (err: any) {
        console.error('soft delete ban gameInfo error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function restoreBanGameInfoController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'invalid id' });
        }

        const updated = await restoreBanGameInfoById(id);
        if (!updated) return res.status(404).json({ error: 'not found' });

        return res.json(updated);
    } catch (err: any) {
        console.error('restore ban gameInfo error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function updateGameTypeByGameUuidController(req: Request, res: Response) {
    try {
        const gameUuid = String(req.body?.game_uuid || '').trim();
        const gameType = String(req.body?.game_type || '').trim();

        if (!gameUuid) {
            return res.status(400).json({ error: 'game_uuid_required' });
        }

        if (!isValidUuid(gameUuid)) {
            return res.status(400).json({ error: 'invalid_game_uuid' });
        }

        if (!gameType) {
            return res.status(400).json({ error: 'game_type_required' });
        }

        const allowedGameTypes = [
            'find_the_match',
            'game_show_quiz',
            'flip_cards',
            'air_plan/flying_fruits',
            'flappy_bird',
            'whack_a_mole',
            'anagram',
            'situation',
            'complete_the_sentence',
        ] as const;

        if (!allowedGameTypes.some((item) => item === gameType)) {
            return res.status(400).json({ error: 'invalid_game_type' });
        }

        const updated = await updateGameTypeByGameUuid(gameUuid, gameType as (typeof allowedGameTypes)[number]);
        if (!updated) {
            return res.status(400).json({ error: 'update_failed' });
        }

        return res.json(updated);
    } catch (err: any) {
        console.error('update game type by game uuid error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function updateThumbnailByGameUuidController(req: Request, res: Response) {
    try {
        const gameUuid = String(req.body?.game_uuid || '').trim();
        if (!gameUuid) {
            return res.status(400).json({ error: 'game_uuid_required' });
        }
        if (!isValidUuid(gameUuid)) {
            return res.status(400).json({ error: 'invalid_game_uuid' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'no file uploaded' });
        }
        const filename = `${req.file.filename}`;
        const updated = await updateThumbnailByGameUuid(gameUuid, filename);
        if (!updated) {
            return res.status(400).json({ error: 'update_failed' });
        }
        const responsePayload = {
            ...updated,
            thumbnail: withUploadPrefix(updated?.thumbnail),
        };
        return res.json(responsePayload);
    } catch (err: any) {
        console.error('update thumbnail by game uuid error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function updateSubjectByGameUuidController(req: Request, res: Response) {
    try {
        const gameUuid = String(req.body?.game_uuid || '').trim();
        const subject = String(req.body?.subject || '').trim();
        if (!gameUuid) {
            return res.status(400).json({ error: 'game_uuid_required' });
        }
        if (!isValidUuid(gameUuid)) {
            return res.status(400).json({ error: 'invalid_game_uuid' });
        }
        if (!subject) {
            return res.status(400).json({ error: 'subject_required' });
        }
        const updated = await updateSubjectByGameUuid(gameUuid, subject);
        if (!updated) {
            return res.status(400).json({ error: 'update_failed' });
        }
        return res.json(updated);
    } catch (err: any) {
        console.error('update subject by game uuid error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function updateGroupIdByGameUuidController(req: Request, res: Response) {
    try {
        const gameUuid = String(req.body?.game_uuid || '').trim();
        const groupId = Number(req.body?.group_id);

        if (!gameUuid) {
            return res.status(400).json({ error: 'game_uuid_required' });
        }
        if (!isValidUuid(gameUuid)) {
            return res.status(400).json({ error: 'invalid_game_uuid' });
        }
        if (!Number.isInteger(groupId) || groupId <= 0) {
            return res.status(400).json({ error: 'invalid_group_id' });
        }

        const updated = await updateGroupIdByGameUuid(gameUuid, groupId);
        if (!updated) {
            return res.status(400).json({ error: 'update_failed' });
        }
        return res.json(updated);
    } catch (err: any) {
        console.error('update group id by game uuid error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function countAllGamesExceptGameDefaultController(req: Request, res: Response) {
    try {
        const count = await countAllGamesExceptGameDefault();
        return res.json({ count });
    } catch (err: any) {
        console.error('count all games except game default error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findAllGamesByPlayCountDescController(req: Request, res: Response) {
    try {
        const games = await findAllGamesByPlayCountDesc();
        return res.json(games);
    } catch (err: any) {
        console.error('get all games by play count desc error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findAllGamesExceptGameDefaultByPlayCountDescController(req: Request, res: Response) {
    try {
        const games = await findAllGamesExceptGameDefaultByPlayCountDesc();
        return res.json(games);
    } catch (err: any) {
        console.error('get all non-default games by play count desc error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function getAllUserCreatedGameLogsController(req: Request, res: Response) {
    try {
        const logs = await getAllUserCreatedGameLogs();
        return res.json(logs);
    } catch (err: any) {
        console.error('get user created game logs error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function getAllGameTypePopularCreateGameRankingController(req: Request, res: Response) {
    try {
        const ranking = await getAllGameTypePopularCreateGameRanking();
        return res.json(ranking);
    } catch (err: any) {
        console.error('get game type popular create game ranking error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function getLiveDashboardGamesCapacityAverageController(req: Request, res: Response) {
    try {
        const result = await getLiveDashboardGamesCapacityAverage();
        return res.json(result);
    } catch (err: any) {
        console.error('get live_dashboard games capacity average error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function getLiveDashboardCapacityByGameUuidController(req: Request, res: Response) {
    try {
        const uuid = String(req.params.uuid || '').trim();
        if (!uuid) {
            return res.status(400).json({ error: 'uuid_required' });
        }

        if (!isValidUuid(uuid)) {
            return res.status(400).json({ error: 'invalid_uuid' });
        }

        const result = await getLiveDashboardCapacityByGameUuid(uuid);
        return res.json(result);
    } catch (err: any) {
        if (err?.message === 'uuid_required') {
            return res.status(400).json({ error: 'uuid_required' });
        }

        console.error('get live_dashboard capacity by game uuid error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}