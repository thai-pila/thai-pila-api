import pool from './db'
import { v4 as uuidv4 } from 'uuid';

export type QuestionType = 'single_question' | 'multi_question';
export type GameType =
    'find_the_match' |
    'game_show_quiz' |
    'flip_cards' |
    'air_plan/flying_fruits' |
    'flappy_bird' |
    'whack_a_mole' |
    'anagram' |
    'situation' |
    'complete_the_sentence';

export interface CreateGamePayload {
    teacher_uuid?: string | null;
    teacher_name?: string | null;
    create_by?: string | null;
    exercise_name?: string;
    description?: string | null;
    subject?: string;
    question_type: QuestionType;
    game_type?: GameType;
    thumbnail?: string | null;
    group_id?: number | null;
    game_default?: boolean;
    class?: string | null;
}

function withUploadPrefix(value: string | null | undefined): string | null | undefined {
    if (!value) return value;
    if (value.startsWith('/upload/')) return value;
    return `/upload/${value}`;
}

function getCategoryIdFromGameType(gameType?: GameType): number | null {
    if (!gameType) return null;

    switch (gameType) {
        case 'find_the_match':
        case 'flip_cards':
            return 1;
        case 'game_show_quiz':
        case 'air_plan/flying_fruits':
        case 'flappy_bird':
            return 2;
        case 'situation':
            return 3;
        case 'anagram':
            return 4;
        case 'complete_the_sentence':
            return 5;
        case 'whack_a_mole':
            return 6;
        default:
            return null;
    }
}

export async function createGame(payload: CreateGamePayload) {
    if (payload.question_type !== 'single_question') {
        throw new Error("question_type must be 'single_question'");
    }

    const teacherName = payload.teacher_name ?? payload.create_by ?? null;
    const exerciseName = payload.exercise_name ?? null;

    if (!teacherName || !exerciseName) {
        throw new Error('teacher_name and exercise_name are required');
    }

    const uuid = uuidv4();
    const categoryId = getCategoryIdFromGameType(payload.game_type);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const text = `
            INSERT INTO game_info (uuid, teacher_uuid, create_by, exercise_name, description, subject, class, question_type, game_type, thumbnail, question_category_id, group_id, game_default)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, question_type, game_type, thumbnail, question_category_id, group_id, game_default, create_at, delete_at
        `;

        const values = [
            uuid,
            payload.teacher_uuid ?? null,
            teacherName,
            exerciseName,
            payload.description ?? null,
            payload.subject ?? null,
            payload.class ?? null,
            payload.question_type,
            payload.game_type ?? null,
            withUploadPrefix(payload.thumbnail) ?? null,
            categoryId,
            payload.group_id ?? null,
            payload.game_default ?? false
        ];

        const gameRes = await client.query(text, values);
        const createdGame = gameRes.rows[0];

        const logRes = await client.query(
            `
            INSERT INTO user_create_game_log (id_game_info, teacher_uuid)
            VALUES ($1, $2)
            RETURNING id, id_game_info, teacher_uuid, create_at
            `,
            [createdGame.id, payload.teacher_uuid ?? null]
        );

        await client.query('COMMIT');

        return {
            ...createdGame,
            teacher_name: createdGame.create_by,
            exercise_name: createdGame.exercise_name,
            create_game_log_id: logRes.rows[0].id,
            create_game_log_teacher_uuid: logRes.rows[0].teacher_uuid
        };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function findGameById(id: number) {
    const res = await pool.query('SELECT id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, question_type, game_type, thumbnail, question_category_id, group_id, game_default, status, create_at, delete_at FROM game_info WHERE id = $1', [id]);
    return res.rows;
}

export async function findAllGames() {
    const res = await pool.query('SELECT id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, question_type, game_type, thumbnail, question_category_id, group_id, game_default, status, create_at, delete_at FROM game_info');
    return res.rows;
}

export async function findGamesbySequenceId(sequenceId: number) {
    const text = `
        SELECT gi.id, gi.uuid, gi.teacher_uuid, gi.create_by, gi.exercise_name, gi.description, gi.subject, gi.class, gi.question_type, gi.game_type, gi.thumbnail, gi.question_category_id, gi.group_id, gi.game_default, gi.status, gi.create_at, gi.delete_at
        FROM game_info gi
        JOIN sequence_game sg ON gi.id = sg.id_game_info
        WHERE sg.id_sequence_info = $1
    `;
    const res = await pool.query(text, [sequenceId]);
    return res.rows;
}

export async function findAllQuestionCategories() {
    const res = await pool.query('SELECT id, type FROM question_category');
    return res.rows;
}

export interface CreateByLibraryItem {
    create_by: string | null;
    source: 'game_info' | 'sequence_info';
}

export async function findAllCreateByByTeacherUuid(teacher_uuid: string): Promise<CreateByLibraryItem[]> {
    const text = `
                (SELECT DISTINCT NULLIF(BTRIM(create_by), '') AS create_by, 'game_info'::text AS source
         FROM game_info
                 WHERE teacher_uuid = $1
                     AND delete_at IS NULL
                     AND NULLIF(BTRIM(create_by), '') IS NOT NULL)
        UNION ALL
                (SELECT DISTINCT NULLIF(BTRIM(create_by), '') AS create_by, 'sequence_info'::text AS source
         FROM sequence_info
                 WHERE teacher_uuid = $1
                     AND delete_at IS NULL
                     AND NULLIF(BTRIM(create_by), '') IS NOT NULL)
        ORDER BY source ASC, create_by ASC NULLS LAST
    `;

    const res = await pool.query(text, [teacher_uuid]);
    return res.rows.map((row: any) => ({
        create_by: row.create_by ?? null,
        source: row.source as 'game_info' | 'sequence_info',
    }));
}

export interface UpdateGameInfoPayload {
    exercise_name?: string;
    suggestion?: string | null;
    description?: string | null;
}

export async function updateExerciseNameAndSuggestionById(id: number, payload: UpdateGameInfoPayload) {
    const updates: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (Object.prototype.hasOwnProperty.call(payload, "exercise_name")) {
        updates.push(`exercise_name = $${idx++}`);
        values.push(payload.exercise_name);
    }

    if (Object.prototype.hasOwnProperty.call(payload, "suggestion")) {
        updates.push(`suggestion = $${idx++}`);
        values.push(payload.suggestion);
    }

    if (Object.prototype.hasOwnProperty.call(payload, "description")) {
        updates.push(`description = $${idx++}`);
        values.push(payload.description);
    }

    if (updates.length === 0) {
        throw new Error("no updatable fields provided");
    }

    const text = `
        UPDATE game_info
        SET ${updates.join(", ")}, update_at = CURRENT_TIMESTAMP
        WHERE id = $${idx}
        RETURNING id, uuid, teacher_uuid, create_by, exercise_name, suggestion, description, subject, class, question_type, game_type, thumbnail, question_category_id, group_id, create_at, update_at
    `;

    values.push(id);

    const res = await pool.query(text, values);
    return res.rows[0];
}

export async function updateOtherImageById(id: number, filename: string | null) {
    const text = `
        UPDATE game_info
        SET other_image = $1, update_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, uuid, teacher_uuid, create_by, other_image
    `;

    const res = await pool.query(text, [withUploadPrefix(filename) ?? null, id]);
    return res.rows[0];
}

export async function hardDeleteOtherImageById(id: number) {
    const text = `
        UPDATE game_info
        SET other_image = NULL, update_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, uuid, teacher_uuid, create_by, other_image
    `;

    const res = await pool.query(text, [id]);
    return res.rows[0];
}

async function resolveMatchingTableNameForGameInfo(): Promise<string> {
    const result = await pool.query(
        `SELECT COALESCE(to_regclass('public.matching')::text, to_regclass('public.matching_question')::text) AS table_name`
    );

    const tableName = result.rows?.[0]?.table_name;
    if (!tableName) {
        throw new Error("matching table not found");
    }

    return tableName;
}

async function resolveAnagramTableNameForGameInfo(): Promise<string> {
    const result = await pool.query(
        `SELECT COALESCE(to_regclass('public.anagram')::text, to_regclass('public.anagram_question')::text) AS table_name`
    );

    const tableName = result.rows?.[0]?.table_name;
    if (!tableName) {
        throw new Error("anagram table not found");
    }

    return tableName;
}

async function resolveCorrectAnswerTableNameForGameInfo(): Promise<string> {
    const result = await pool.query(
        `SELECT COALESCE(to_regclass('public.correct_answer')::text, to_regclass('public.correct_answer_question')::text) AS table_name`
    );

    const tableName = result.rows?.[0]?.table_name;
    if (!tableName) {
        throw new Error("correct answer table not found");
    }

    return tableName;
}

type CompleteTheSentenceResolvedSchema = {
    tableName: string;
    soundQuestionColumn: string;
    imageQuestionColumn: string;
    hasQuestionAnswerColumn: boolean;
    hasQuestionColumn: boolean;
    hasChoiceTable: boolean;
};

function parseCompleteTheSentenceQuestionAnswer(value: any): any {
    if (value === null || value === undefined || typeof value !== "string") {
        return value;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return value;
    }

    try {
        return JSON.parse(trimmed);
    } catch {
        return value;
    }
}

async function resolveCompleteTheSentenceSchemaByClient(client: any): Promise<CompleteTheSentenceResolvedSchema> {
    const tableRes = await client.query(
        `SELECT COALESCE(to_regclass('public.complete_the_sentence')::text, to_regclass('public.complete_the_sentence_question')::text) AS table_name`
    );

    const tableName = tableRes.rows?.[0]?.table_name;
    if (!tableName) {
        throw new Error("complete_the_sentence table not found");
    }

    const bareTableName = String(tableName).replace("public.", "");
    const columnRes = await client.query(
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        `,
        [bareTableName]
    );

    const columns = new Set<string>(columnRes.rows.map((row: any) => row.column_name));
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

    const choiceTableRes = await client.query(
        `SELECT to_regclass('public.complete_the_sentence_choice')::text AS table_name`
    );

    return {
        tableName,
        soundQuestionColumn,
        imageQuestionColumn,
        hasQuestionAnswerColumn: columns.has("question_answer"),
        hasQuestionColumn: columns.has("question"),
        hasChoiceTable: Boolean(choiceTableRes.rows?.[0]?.table_name),
    };
}

async function resolveCompleteTheSentenceSchemaForGameInfo(): Promise<CompleteTheSentenceResolvedSchema> {
    return resolveCompleteTheSentenceSchemaByClient(pool);
}

async function findSituationAssetsByGameId(gameId: number) {
    const assetsRes = await pool.query(
        `
        SELECT id, id_game_info, asset, position, create_at, update_at
        FROM situation_assets
        WHERE id_game_info = $1 AND delete_at IS NULL
        ORDER BY id ASC
        `,
        [gameId]
    );

    for (const asset of assetsRes.rows) {
        asset.asset = withUploadPrefix(asset.asset);
    }

    return assetsRes.rows;
}


async function findQuestionsByGameId(gameId: number, gameType: GameType | string | null | undefined) {
    const isFindTheMatchGame = gameType === "find_the_match" || gameType === "flip_cards";
    if (isFindTheMatchGame) {
        const matchingTable = await resolveMatchingTableNameForGameInfo();
        const matchingsRes = await pool.query(
            `
            SELECT id, id_game_info, no, keyword, matching_word, hint, sound_keyword, image_keyword, sound_hint, image_hint, sound_matching_word, image_matching_word, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at
            FROM ${matchingTable}
            WHERE id_game_info = $1 AND delete_at IS NULL
            ORDER BY no ASC
            `,
            [gameId]
        );
        return matchingsRes.rows;
    }

    const isAnagramGame = gameType === "anagram";
    if (isAnagramGame) {
        const anagramTable = await resolveAnagramTableNameForGameInfo();
        const anagramsRes = await pool.query(
            `
            SELECT id, id_game_info, no, word, swap_word, hint, sound_word, image_word, sound_hint, image_hint, sound_swap_word, image_swap_word, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at
            FROM ${anagramTable}
            WHERE id_game_info = $1 AND delete_at IS NULL
            ORDER BY no ASC
            `,
            [gameId]
        );
        return anagramsRes.rows;
    }

    const isCorrectAnswerGame = gameType === "whack_a_mole";
    if (isCorrectAnswerGame) {
        const correctAnswerTable = await resolveCorrectAnswerTableNameForGameInfo();
        const correctAnswersRes = await pool.query(
            `
            SELECT id, id_game_info, no, correct_answer, wrong_answer, hint, sound_correct_answer, image_correct_answer, sound_hint, image_hint, sound_wrong_answer, image_wrong_answer, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at
            FROM ${correctAnswerTable}
            WHERE id_game_info = $1 AND delete_at IS NULL
            ORDER BY no ASC
            `,
            [gameId]
        );
        return correctAnswersRes.rows;
    }

    const isSituationGame = gameType === "situation";
    const isCompleteTheSentenceGame = gameType === "complete_the_sentence";
    const isMultipleChoiceGame =
        gameType === "game_show_quiz" ||
        gameType === "air_plan/flying_fruits" ||
        gameType === "flappy_bird";

    if (!isSituationGame && !isMultipleChoiceGame && !isCompleteTheSentenceGame) {
        return [];
    }

    if (isCompleteTheSentenceGame) {
        const schema = await resolveCompleteTheSentenceSchemaForGameInfo();

        if (schema.hasQuestionAnswerColumn) {
            const questionsRes = await pool.query(
                `
                SELECT id, id_game_info, no, question_answer, hint,
                       ${schema.soundQuestionColumn} AS sound_question_answer,
                       ${schema.imageQuestionColumn} AS image_question_answer,
                       sound_hint, image_hint,
                       skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing,
                       audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at
                FROM ${schema.tableName}
                WHERE id_game_info = $1 AND delete_at IS NULL
                ORDER BY no ASC, id ASC
                `,
                [gameId]
            );

            return questionsRes.rows.map((row: any) => ({
                ...row,
                question_answer: parseCompleteTheSentenceQuestionAnswer(row.question_answer),
            }));
        }

        if (schema.hasQuestionColumn && schema.hasChoiceTable) {
            const questionsRes = await pool.query(
                `
                SELECT id, id_game_info, no, question, hint,
                       ${schema.soundQuestionColumn} AS sound_question,
                       ${schema.imageQuestionColumn} AS image_question,
                       sound_hint, image_hint,
                       skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing,
                       audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at
                FROM ${schema.tableName}
                WHERE id_game_info = $1 AND delete_at IS NULL
                ORDER BY no ASC, id ASC
                `,
                [gameId]
            );

            const questions = questionsRes.rows;
            for (const question of questions) {
                const choicesRes = await pool.query(
                    `
                    SELECT id, id_complete_the_sentence_question, choice, is_correct, sound_choice, image_choice, create_at
                    FROM complete_the_sentence_choice
                    WHERE id_complete_the_sentence_question = $1 AND delete_at IS NULL
                    ORDER BY id ASC
                    `,
                    [question.id]
                );
                question.choices = choicesRes.rows;
            }

            return questions;
        }

        return [];
    }

    const questionTable = isSituationGame ? "situation_question_multiple" : "question_multiple";
    const choiceTable = isSituationGame ? "situation_choice_multiple" : "choice_multiple";
    const questionSelect = isSituationGame
        ? "id, id_game_info, no, question, question_position, hint, sound_question, image_question, sound_hint, image_hint, shuffle_answer, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at"
        : "id, id_game_info, no, question, hint, sound_question, image_question, sound_hint, image_hint, shuffle_answer, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time, create_at";

    const questionsRes = await pool.query(
        `
        SELECT ${questionSelect}
        FROM ${questionTable}
        WHERE id_game_info = $1 AND delete_at IS NULL
        ORDER BY no ASC
        `,
        [gameId]
    );

    const dedupQuestionMap = new Map<number, any>();
    for (const q of questionsRes.rows) {
        if (!dedupQuestionMap.has(q.id)) {
            dedupQuestionMap.set(q.id, q);
        }
    }

    const dedupQuestions = Array.from(dedupQuestionMap.values());
    for (const question of dedupQuestions) {
        const choicesRes = await pool.query(
            `
            SELECT id, id_question_multiple, choice, is_correct, sound_choice, image_choice, create_at
            FROM ${choiceTable}
            WHERE id_question_multiple = $1 AND delete_at IS NULL
            ORDER BY id ASC
            `,
            [question.id]
        );

        const dedupChoiceMap = new Map<number, any>();
        for (const c of choicesRes.rows) {
            if (!dedupChoiceMap.has(c.id)) {
                dedupChoiceMap.set(c.id, c);
            }
        }

        question.choices = Array.from(dedupChoiceMap.values());
    }

    return dedupQuestions;
}

export async function findGameInfoByUuidWithQuestions(uuidNewgen: string) {
    const mappingRes = await pool.query(
        `
        SELECT uuid_newgen, uuid_gameinfo, uuid_sequenceinfo, teacher_uuid
        FROM uuid_for_pila
        WHERE uuid_newgen = $1 OR uuid_gameinfo = $1 OR uuid_sequenceinfo = $1
        ORDER BY
            CASE
                WHEN uuid_newgen = $1 THEN 0
                WHEN uuid_gameinfo = $1 THEN 1
                WHEN uuid_sequenceinfo = $1 THEN 2
                ELSE 3
            END,
            create_at DESC,
            id DESC
        LIMIT 1
        `,
        [uuidNewgen]
    );

    if (mappingRes.rowCount === 0) {
        const directGameRes = await pool.query(
            `
            SELECT id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, question_type, game_type, thumbnail, question_category_id, group_id, status, other_image, suggestion, ban_at, create_at, delete_at
            FROM game_info
            WHERE uuid = $1 AND delete_at IS NULL
            LIMIT 1
            `,
            [uuidNewgen]
        );

        if (directGameRes.rowCount === 0) {
            const directSequenceRes = await pool.query(
                `
                SELECT id, uuid, create_by, exercise_name, subject, thumbnail, status, create_at, update_at, delete_at
                FROM sequence_info
                WHERE uuid = $1 AND delete_at IS NULL
                LIMIT 1
                `,
                [uuidNewgen]
            );

            if (directSequenceRes.rowCount === 0) {
                return null;
            }

            const sequenceInfo = directSequenceRes.rows[0];
            sequenceInfo.uuid_newgen = null;
            sequenceInfo.thumbnail = withUploadPrefix(sequenceInfo.thumbnail);

            const gamesRes = await pool.query(
                `
                SELECT gi.id, gi.uuid, gi.teacher_uuid, gi.create_by, gi.exercise_name, gi.description, gi.subject, gi.class, gi.question_type, gi.game_type, gi.thumbnail, gi.question_category_id, gi.group_id, gi.game_default, gi.other_image, gi.suggestion, gi.create_at, gi.delete_at
                FROM sequence_game sg
                JOIN game_info gi ON gi.id = sg.id_game_info
                WHERE sg.id_sequence_info = $1 AND gi.delete_at IS NULL
                ORDER BY sg.id ASC
                `,
                [sequenceInfo.id]
            );

            const games = await Promise.all(
                gamesRes.rows.map(async (game: any) => {
                    game.uuid_newgen = null;
                    game.thumbnail = withUploadPrefix(game.thumbnail);
                    game.other_image = withUploadPrefix(game.other_image);
                    const questions = await findQuestionsByGameId(game.id as number, game.game_type);
                    const situation_assets = game.game_type === "situation"
                        ? await findSituationAssetsByGameId(game.id as number)
                        : [];

                    return {
                        game_info: game,
                        questions,
                        situation_assets,
                    };
                })
            );

            return {
                source: 'sequence',
                sequence_info: sequenceInfo,
                games,
            };
        }

        const gameInfo = directGameRes.rows[0];
        gameInfo.uuid_newgen = null;
        gameInfo.thumbnail = withUploadPrefix(gameInfo.thumbnail);
        gameInfo.other_image = withUploadPrefix(gameInfo.other_image);
        const questions = await findQuestionsByGameId(gameInfo.id as number, gameInfo.game_type);
        const situation_assets = gameInfo.game_type === "situation"
            ? await findSituationAssetsByGameId(gameInfo.id as number)
            : [];

        return {
            source: 'game',
            game_info: gameInfo,
            questions,
            situation_assets,
        };
    }

    const mapping = mappingRes.rows[0];

    if (mapping.uuid_gameinfo) {
        const gameRes = await pool.query(
            `
            SELECT id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, question_type, game_type, thumbnail, question_category_id, group_id, game_default, status, other_image, suggestion, ban_at, create_at, delete_at
            FROM game_info
            WHERE uuid = $1 AND delete_at IS NULL
            LIMIT 1
            `,
            [mapping.uuid_gameinfo]
        );

        if (gameRes.rowCount === 0) {
            return null;
        }

        const gameInfo = gameRes.rows[0];
        gameInfo.uuid_newgen = mapping.uuid_newgen;
        gameInfo.thumbnail = withUploadPrefix(gameInfo.thumbnail);
        gameInfo.other_image = withUploadPrefix(gameInfo.other_image);
        const questions = await findQuestionsByGameId(gameInfo.id as number, gameInfo.game_type);
        const situation_assets = gameInfo.game_type === "situation"
            ? await findSituationAssetsByGameId(gameInfo.id as number)
            : [];

        return {
            source: 'game',
            game_info: gameInfo,
            questions,
            situation_assets,
        };
    }

    if (mapping.uuid_sequenceinfo) {
        const sequenceRes = await pool.query(
            `
            SELECT id, uuid, create_by, exercise_name, subject, thumbnail, status, create_at, update_at, delete_at
            FROM sequence_info
            WHERE uuid = $1 AND delete_at IS NULL
            LIMIT 1
            `,
            [mapping.uuid_sequenceinfo]
        );

        if (sequenceRes.rowCount === 0) {
            return null;
        }

        const sequenceInfo = sequenceRes.rows[0];
        sequenceInfo.uuid_newgen = mapping.uuid_newgen;
        sequenceInfo.thumbnail = withUploadPrefix(sequenceInfo.thumbnail);

        const gamesRes = await pool.query(
            `
            SELECT gi.id, gi.uuid, gi.teacher_uuid, gi.create_by, gi.exercise_name, gi.description, gi.subject, gi.class, gi.question_type, gi.game_type, gi.thumbnail, gi.question_category_id, gi.group_id, gi.game_default, gi.status, gi.other_image, gi.suggestion, gi.create_at, gi.delete_at
            FROM sequence_game sg
            JOIN game_info gi ON gi.id = sg.id_game_info
            WHERE sg.id_sequence_info = $1 AND gi.delete_at IS NULL
            ORDER BY sg.id ASC
            `,
            [sequenceInfo.id]
        );

        const games = await Promise.all(
            gamesRes.rows.map(async (game: any) => {
                game.uuid_newgen = mapping.uuid_newgen;
                game.thumbnail = withUploadPrefix(game.thumbnail);
                game.other_image = withUploadPrefix(game.other_image);
                const questions = await findQuestionsByGameId(game.id as number, game.game_type);
                const situation_assets = game.game_type === "situation"
                    ? await findSituationAssetsByGameId(game.id as number)
                    : [];
                return {
                    game_info: game,
                    questions,
                    situation_assets,
                };
            })
        );

        return {
            source: 'sequence',
            sequence_info: sequenceInfo,
            games,
        };
    }

    return null;
}

export async function softDeleteGameInfoById(id: number) {
    const text = `
        UPDATE game_info
        SET delete_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, question_type, game_type, thumbnail, question_category_id, group_id, game_default, status, other_image, suggestion, create_at, delete_at
    `;
    const res = await pool.query(text, [id]);
    return res.rows[0];
}

export interface CreateUuidForPilaPayload {
    uuid_gameinfo?: string;
    uuid_sequenceinfo?: string;
    teacher_uuid?: string;
}

type CategoryGameType = 'multiple_choice' | 'matching' | 'anagram' | 'situation' | 'correct_answer';

interface SwapOptionsResult {
    selected_game: GameType;
    category_game_type: CategoryGameType;
    games: GameType[];
}

const GAME_GROUPS: ReadonlyArray<{ category_game_type: CategoryGameType; games: ReadonlyArray<GameType> }> = [
    {
        category_game_type: 'multiple_choice',
        games: ['game_show_quiz', 'air_plan/flying_fruits', 'flappy_bird'],
    },
    {
        category_game_type: 'matching',
        games: ['find_the_match', 'flip_cards'],
    },
    {
        category_game_type: 'anagram',
        games: ['anagram'],
    },
    {
        category_game_type: 'situation',
        games: ['situation'],
    },
    {
        category_game_type: 'correct_answer',
        games: ['whack_a_mole'],
    },
];

function normalizeGameType(value: unknown): string {
    return String(value ?? '').trim();
}

export function getSwapOptionsByGameType(gameTypeInput: unknown): SwapOptionsResult {
    const gameType = normalizeGameType(gameTypeInput);
    if (!gameType) {
        const err: any = new Error('game_type is required');
        err.code = 'SWAP_GAME_TYPE_REQUIRED';
        throw err;
    }

    const matchedGroup = GAME_GROUPS.find((group) => group.games.includes(gameType as GameType));
    if (!matchedGroup) {
        const err: any = new Error('invalid game_type');
        err.code = 'SWAP_INVALID_GAME_TYPE';
        throw err;
    }

    return {
        selected_game: gameType as GameType,
        category_game_type: matchedGroup.category_game_type,
        games: [...matchedGroup.games],
    };
}

export async function generateUUIDForPila(payload: CreateUuidForPilaPayload) {
    const uuid_gameinfo = payload.uuid_gameinfo?.trim();
    const uuid_sequenceinfo = payload.uuid_sequenceinfo?.trim();

    if ((uuid_gameinfo && uuid_sequenceinfo) || (!uuid_gameinfo && !uuid_sequenceinfo)) {
        const err: any = new Error('provide exactly one of uuid_gameinfo or uuid_sequenceinfo');
        err.code = 'PILA_INVALID_INPUT';
        throw err;
    }

    const uuid_newgen = uuidv4();

    const text = uuid_gameinfo
        ? `
        INSERT INTO uuid_for_pila (uuid_newgen, uuid_gameinfo, teacher_uuid)
        VALUES ($1, $2, $3)
        RETURNING id, uuid_newgen, uuid_gameinfo, uuid_sequenceinfo, create_at, update_at
    `
        : `
        INSERT INTO uuid_for_pila (uuid_newgen, uuid_sequenceinfo, teacher_uuid)
        VALUES ($1, $2, $3)
        RETURNING id, uuid_newgen, uuid_gameinfo, uuid_sequenceinfo, create_at, update_at
    `;

    const refUuid = uuid_gameinfo ?? uuid_sequenceinfo;
    const res = await pool.query(text, [uuid_newgen, refUuid, payload.teacher_uuid ?? null]);
    return res.rows[0];
}

interface CloneGameTemplateResult {
    source_game_uuid: string;
    new_game_id: number;
    new_game_uuid: string;
    game_type: GameType | string | null;
    copied_counts: {
        questions: number;
        choices: number;
        matchings: number;
        anagrams: number;
        situation_assets: number;
    };
}

type DbClient = {
    query: (text: string, values?: any[]) => Promise<any>;
};

async function resolveGameUuidForClone(client: DbClient, sourceUuidRaw: string): Promise<string> {
    const sourceUuid = sourceUuidRaw.trim();
    if (!sourceUuid) {
        const err: any = new Error('source_uuid is required');
        err.code = 'CLONE_SOURCE_UUID_REQUIRED';
        throw err;
    }

    const mappingRes = await client.query(
        `
        SELECT uuid_newgen, uuid_gameinfo, uuid_sequenceinfo, teacher_uuid
        FROM uuid_for_pila
        WHERE uuid_newgen = $1 OR uuid_gameinfo = $1 OR uuid_sequenceinfo = $1
        ORDER BY
            CASE
                WHEN uuid_newgen = $1 THEN 0
                WHEN uuid_gameinfo = $1 THEN 1
                WHEN uuid_sequenceinfo = $1 THEN 2
                ELSE 3
            END,
            create_at DESC,
            id DESC
        LIMIT 1
        `,
        [sourceUuid]
    );

    if (mappingRes.rowCount > 0) {
        const mapping = mappingRes.rows[0];
        if (mapping.uuid_gameinfo) {
            return String(mapping.uuid_gameinfo);
        }

        if (mapping.uuid_sequenceinfo) {
            const err: any = new Error('source_uuid points to sequence');
            err.code = 'CLONE_SEQUENCE_NOT_SUPPORTED';
            throw err;
        }
    }

    return sourceUuid;
}

async function resolveMatchingTableNameForClone(client: DbClient): Promise<string> {
    const result = await client.query(
        `SELECT COALESCE(to_regclass('public.matching')::text, to_regclass('public.matching_question')::text) AS table_name`
    );

    const tableName = result.rows?.[0]?.table_name;
    if (!tableName) {
        throw new Error('matching table not found');
    }

    return tableName;
}

async function resolveAnagramTableNameForClone(client: DbClient): Promise<string> {
    const result = await client.query(
        `SELECT COALESCE(to_regclass('public.anagram')::text, to_regclass('public.anagram_question')::text) AS table_name`
    );

    const tableName = result.rows?.[0]?.table_name;
    if (!tableName) {
        throw new Error('anagram table not found');
    }

    return tableName;
}

async function resolveCorrectAnswerTableNameForClone(client: DbClient): Promise<string> {
    const result = await client.query(
        `SELECT COALESCE(to_regclass('public.correct_answer')::text, to_regclass('public.correct_answer_question')::text) AS table_name`
    );

    const tableName = result.rows?.[0]?.table_name;
    if (!tableName) {
        throw new Error('correct answer table not found');
    }

    return tableName;
}

async function resolveCompleteTheSentenceSchemaForClone(client: DbClient): Promise<CompleteTheSentenceResolvedSchema> {
    return resolveCompleteTheSentenceSchemaByClient(client);
}

export async function cloneGameTemplateBySourceUuid(sourceUuidRaw: string, teacherUuidRaw: string): Promise<CloneGameTemplateResult> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const teacherUuid = teacherUuidRaw.trim();
        if (!teacherUuid) {
            const err: any = new Error('teacher_uuid is required');
            err.code = 'CLONE_TEACHER_UUID_REQUIRED';
            throw err;
        }

        const sourceGameUuid = await resolveGameUuidForClone(client, sourceUuidRaw);

        const sourceGameRes = await client.query(
            `
            SELECT id, uuid, teacher_uuid, create_by, exercise_name, suggestion, description, subject, class, question_type, game_type, thumbnail, other_image, question_category_id, group_id, game_default, status
            FROM game_info
            WHERE uuid = $1 AND delete_at IS NULL
            LIMIT 1
            `,
            [sourceGameUuid]
        );

        if (sourceGameRes.rowCount === 0) {
            const err: any = new Error('source game not found');
            err.code = 'CLONE_SOURCE_GAME_NOT_FOUND';
            throw err;
        }

        const sourceGame = sourceGameRes.rows[0];
        const newGameUuid = uuidv4();

        const insertedGameRes = await client.query(
            `
            INSERT INTO game_info (
                uuid, teacher_uuid, create_by, exercise_name, suggestion, description, subject, class, question_type, game_type,
                thumbnail, other_image, question_category_id, group_id, game_default, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id, uuid, game_type
            `,
            [
                newGameUuid,
                teacherUuid,
                sourceGame.create_by ?? null,
                sourceGame.exercise_name ?? null,
                sourceGame.suggestion ?? null,
                sourceGame.description ?? null,
                sourceGame.subject ?? null,
                sourceGame.class ?? null,
                sourceGame.question_type ?? null,
                sourceGame.game_type ?? null,
                sourceGame.thumbnail ?? null,
                sourceGame.other_image ?? null,
                sourceGame.question_category_id ?? null,
                sourceGame.group_id ?? null,
                false,
                sourceGame.status ?? null,
            ]
        );

        const newGame = insertedGameRes.rows[0];
        const sourceGameId = Number(sourceGame.id);
        const newGameId = Number(newGame.id);
        const gameType = sourceGame.game_type as GameType | string | null;

        let questionsCount = 0;
        let choicesCount = 0;
        let matchingsCount = 0;
        let anagramsCount = 0;
        let situationAssetsCount = 0;

        const isMultipleChoiceGame =
            gameType === 'game_show_quiz' ||
            gameType === 'air_plan/flying_fruits' ||
            gameType === 'flappy_bird';

        if (isMultipleChoiceGame) {
            const sourceQuestionsRes = await client.query(
                `
                SELECT id, no, question, hint, sound_question, image_question, sound_hint, image_hint,
                       shuffle_answer, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time
                FROM question_multiple
                WHERE id_game_info = $1 AND delete_at IS NULL
                ORDER BY no ASC, id ASC
                `,
                [sourceGameId]
            );

            questionsCount = sourceQuestionsRes.rowCount ?? 0;

            for (const sourceQuestion of sourceQuestionsRes.rows) {
                const newQuestionRes = await client.query(
                    `
                    INSERT INTO question_multiple (
                        id_game_info, no, question, hint, sound_question, image_question, sound_hint, image_hint,
                        shuffle_answer, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
                    RETURNING id
                    `,
                    [
                        newGameId,
                        sourceQuestion.no,
                        sourceQuestion.question,
                        sourceQuestion.hint,
                        sourceQuestion.sound_question,
                        sourceQuestion.image_question,
                        sourceQuestion.sound_hint,
                        sourceQuestion.image_hint,
                        sourceQuestion.shuffle_answer,
                        sourceQuestion.skill_listening_speaking,
                        sourceQuestion.skill_lang_nature,
                        sourceQuestion.skill_reading,
                        sourceQuestion.skill_writing,
                        sourceQuestion.audio_question,
                        sourceQuestion.audio_choice,
                        sourceQuestion.audio_assistant_voice,
                        sourceQuestion.audio_background,
                        sourceQuestion.expected_time ?? 0
                    ]
                );

                const newQuestionId = newQuestionRes.rows[0].id;

                const sourceChoicesRes = await client.query(
                    `
                    SELECT choice, is_correct, sound_choice, image_choice
                    FROM choice_multiple
                    WHERE id_question_multiple = $1 AND delete_at IS NULL
                    ORDER BY id ASC
                    `,
                    [sourceQuestion.id]
                );

                for (const sourceChoice of sourceChoicesRes.rows) {
                    await client.query(
                        `
                        INSERT INTO choice_multiple (
                            id_question_multiple, choice, is_correct, sound_choice, image_choice
                        )
                        VALUES ($1, $2, $3, $4, $5)
                        `,
                        [
                            newQuestionId,
                            sourceChoice.choice,
                            sourceChoice.is_correct,
                            sourceChoice.sound_choice,
                            sourceChoice.image_choice,
                        ]
                    );
                    choicesCount += 1;
                }
            }
        } else if (gameType === 'situation') {
            const sourceQuestionsRes = await client.query(
                `
                SELECT id, no, question, question_position, hint, sound_question, image_question, sound_hint, image_hint, shuffle_answer, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time
                FROM situation_question_multiple
                WHERE id_game_info = $1 AND delete_at IS NULL
                ORDER BY no ASC, id ASC
                `,
                [sourceGameId]
            );

            questionsCount = sourceQuestionsRes.rowCount ?? 0;

            for (const sourceQuestion of sourceQuestionsRes.rows) {
                const newQuestionRes = await client.query(
                    `
                    INSERT INTO situation_question_multiple (
                        id_game_info, no, question, question_position, hint, sound_question, image_question, sound_hint, image_hint,
                        shuffle_answer, skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                    RETURNING id
                    `,
                    [
                        newGameId,
                        sourceQuestion.no,
                        sourceQuestion.question,
                        sourceQuestion.question_position,
                        sourceQuestion.hint,
                        sourceQuestion.sound_question,
                        sourceQuestion.image_question,
                        sourceQuestion.sound_hint,
                        sourceQuestion.image_hint,
                        sourceQuestion.shuffle_answer,
                        sourceQuestion.skill_listening_speaking,
                        sourceQuestion.skill_lang_nature,
                        sourceQuestion.skill_reading,
                        sourceQuestion.skill_writing,
                        sourceQuestion.audio_question,
                        sourceQuestion.audio_choice,
                        sourceQuestion.audio_assistant_voice,
                        sourceQuestion.audio_background,
                        sourceQuestion.expected_time ?? 0
                    ]
                );

                const newQuestionId = newQuestionRes.rows[0].id;

                const sourceChoicesRes = await client.query(
                    `
                    SELECT choice, is_correct, sound_choice, image_choice
                    FROM situation_choice_multiple
                    WHERE id_question_multiple = $1 AND delete_at IS NULL
                    ORDER BY id ASC
                    `,
                    [sourceQuestion.id]
                );

                for (const sourceChoice of sourceChoicesRes.rows) {
                    await client.query(
                        `
                        INSERT INTO situation_choice_multiple (
                            id_question_multiple, choice, is_correct, sound_choice, image_choice
                        )
                        VALUES ($1, $2, $3, $4, $5)
                        `,
                        [
                            newQuestionId,
                            sourceChoice.choice,
                            sourceChoice.is_correct,
                            sourceChoice.sound_choice,
                            sourceChoice.image_choice,
                        ]
                    );
                    choicesCount += 1;
                }
            }

            const sourceAssetsRes = await client.query(
                `
                SELECT asset, position
                FROM situation_assets
                WHERE id_game_info = $1 AND delete_at IS NULL
                ORDER BY id ASC
                `,
                [sourceGameId]
            );

            for (const sourceAsset of sourceAssetsRes.rows) {
                await client.query(
                    `
                    INSERT INTO situation_assets (id_game_info, asset, position)
                    VALUES ($1, $2, $3)
                    `,
                    [newGameId, sourceAsset.asset, sourceAsset.position]
                );
                situationAssetsCount += 1;
            }
        } else if (gameType === 'find_the_match' || gameType === 'flip_cards') {
            const matchingTable = await resolveMatchingTableNameForClone(client);
            const sourceMatchingsRes = await client.query(
                `
                SELECT no, keyword, matching_word, hint, sound_keyword, image_keyword, sound_hint, image_hint,
                       sound_matching_word, image_matching_word,
                       skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time
                FROM ${matchingTable}
                WHERE id_game_info = $1 AND delete_at IS NULL
                ORDER BY no ASC, id ASC
                `,
                [sourceGameId]
            );

            for (const sourceMatching of sourceMatchingsRes.rows) {
                await client.query(
                    `
                    INSERT INTO ${matchingTable} (
                        id_game_info, no, keyword, matching_word, hint, sound_keyword, image_keyword, sound_hint, image_hint,
                        sound_matching_word, image_matching_word,
                        skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                    `,
                    [
                        newGameId,
                        sourceMatching.no,
                        sourceMatching.keyword,
                        sourceMatching.matching_word,
                        sourceMatching.hint,
                        sourceMatching.sound_keyword,
                        sourceMatching.image_keyword,
                        sourceMatching.sound_hint,
                        sourceMatching.image_hint,
                        sourceMatching.sound_matching_word,
                        sourceMatching.image_matching_word,
                        sourceMatching.skill_listening_speaking,
                        sourceMatching.skill_lang_nature,
                        sourceMatching.skill_reading,
                        sourceMatching.skill_writing,
                        sourceMatching.audio_question,
                        sourceMatching.audio_choice,
                        sourceMatching.audio_assistant_voice,
                        sourceMatching.audio_background,
                        sourceMatching.expected_time ?? 0
                    ]
                );
                matchingsCount += 1;
            }
        } else if (gameType === 'whack_a_mole') {
            const correctAnswerTable = await resolveCorrectAnswerTableNameForClone(client);
            const sourceCorrectAnswersRes = await client.query(
                `
                SELECT no, correct_answer, wrong_answer, hint, sound_correct_answer, image_correct_answer, sound_hint, image_hint,
                       sound_wrong_answer, image_wrong_answer,
                       skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time
                FROM ${correctAnswerTable}
                WHERE id_game_info = $1 AND delete_at IS NULL
                ORDER BY no ASC, id ASC
                `,
                [sourceGameId]
            );

            questionsCount = sourceCorrectAnswersRes.rowCount ?? 0;

            for (const sourceCorrectAnswer of sourceCorrectAnswersRes.rows) {
                await client.query(
                    `
                    INSERT INTO ${correctAnswerTable} (
                        id_game_info, no, correct_answer, wrong_answer, hint, sound_correct_answer, image_correct_answer, sound_hint, image_hint,
                        sound_wrong_answer, image_wrong_answer,
                        skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                    `,
                    [
                        newGameId,
                        sourceCorrectAnswer.no,
                        sourceCorrectAnswer.correct_answer,
                        sourceCorrectAnswer.wrong_answer,
                        sourceCorrectAnswer.hint,
                        sourceCorrectAnswer.sound_correct_answer,
                        sourceCorrectAnswer.image_correct_answer,
                        sourceCorrectAnswer.sound_hint,
                        sourceCorrectAnswer.image_hint,
                        sourceCorrectAnswer.sound_wrong_answer,
                        sourceCorrectAnswer.image_wrong_answer,
                        sourceCorrectAnswer.skill_listening_speaking,
                        sourceCorrectAnswer.skill_lang_nature,
                        sourceCorrectAnswer.skill_reading,
                        sourceCorrectAnswer.skill_writing,
                        sourceCorrectAnswer.audio_question,
                        sourceCorrectAnswer.audio_choice,
                        sourceCorrectAnswer.audio_assistant_voice,
                        sourceCorrectAnswer.audio_background,
                        sourceCorrectAnswer.expected_time ?? 0
                    ]
                );
            }
        } else if (gameType === 'anagram') {
            const anagramTable = await resolveAnagramTableNameForClone(client);
            const sourceAnagramsRes = await client.query(
                `
                SELECT no, word, swap_word, hint, sound_word, image_word, sound_hint, image_hint,
                       sound_swap_word, image_swap_word,
                       skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time
                FROM ${anagramTable}
                WHERE id_game_info = $1 AND delete_at IS NULL
                ORDER BY no ASC, id ASC
                `,
                [sourceGameId]
            );

            for (const sourceAnagram of sourceAnagramsRes.rows) {
                await client.query(
                    `
                    INSERT INTO ${anagramTable} (
                        id_game_info, no, word, swap_word, hint, sound_word, image_word, sound_hint, image_hint,
                        sound_swap_word, image_swap_word,
                        skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                    `,
                    [
                        newGameId,
                        sourceAnagram.no,
                        sourceAnagram.word,
                        sourceAnagram.swap_word,
                        sourceAnagram.hint,
                        sourceAnagram.sound_word,
                        sourceAnagram.image_word,
                        sourceAnagram.sound_hint,
                        sourceAnagram.image_hint,
                        sourceAnagram.sound_swap_word,
                        sourceAnagram.image_swap_word,
                        sourceAnagram.skill_listening_speaking,
                        sourceAnagram.skill_lang_nature,
                        sourceAnagram.skill_reading,
                        sourceAnagram.skill_writing,
                        sourceAnagram.audio_question,
                        sourceAnagram.audio_choice,
                        sourceAnagram.audio_assistant_voice,
                        sourceAnagram.audio_background,
                        sourceAnagram.expected_time ?? 0
                    ]
                );
                anagramsCount += 1;
            }
        } else if (gameType === 'complete_the_sentence') {
            const schema = await resolveCompleteTheSentenceSchemaForClone(client);

            if (schema.hasQuestionAnswerColumn) {
                const sourceRowsRes = await client.query(
                    `
                    SELECT no, question_answer, hint,
                           ${schema.soundQuestionColumn} AS sound_question_answer,
                           ${schema.imageQuestionColumn} AS image_question_answer,
                           sound_hint, image_hint,
                           skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing,
                           audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time
                    FROM ${schema.tableName}
                    WHERE id_game_info = $1 AND delete_at IS NULL
                    ORDER BY no ASC, id ASC
                    `,
                    [sourceGameId]
                );

                questionsCount = sourceRowsRes.rowCount ?? 0;

                for (const sourceRow of sourceRowsRes.rows) {
                    await client.query(
                        `
                        INSERT INTO ${schema.tableName} (
                            id_game_info, no, question_answer, hint,
                            ${schema.soundQuestionColumn}, ${schema.imageQuestionColumn},
                            sound_hint, image_hint,
                            skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing,
                            audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                        `,
                        [
                            newGameId,
                            sourceRow.no,
                            sourceRow.question_answer,
                            sourceRow.hint,
                            sourceRow.sound_question_answer,
                            sourceRow.image_question_answer,
                            sourceRow.sound_hint,
                            sourceRow.image_hint,
                            sourceRow.skill_listening_speaking,
                            sourceRow.skill_lang_nature,
                            sourceRow.skill_reading,
                            sourceRow.skill_writing,
                            sourceRow.audio_question,
                            sourceRow.audio_choice,
                            sourceRow.audio_assistant_voice,
                            sourceRow.audio_background,
                            sourceRow.expected_time ?? 0,
                        ]
                    );
                }
            } else if (schema.hasQuestionColumn && schema.hasChoiceTable) {
                const sourceQuestionsRes = await client.query(
                    `
                    SELECT id, no, question, hint,
                           ${schema.soundQuestionColumn} AS sound_question,
                           ${schema.imageQuestionColumn} AS image_question,
                           sound_hint, image_hint,
                           skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time
                    FROM ${schema.tableName}
                    WHERE id_game_info = $1 AND delete_at IS NULL
                    ORDER BY no ASC, id ASC
                    `,
                    [sourceGameId]
                );

                questionsCount = sourceQuestionsRes.rowCount ?? 0;

                for (const sourceQuestion of sourceQuestionsRes.rows) {
                    const newQuestionRes = await client.query(
                        `
                        INSERT INTO ${schema.tableName} (
                            id_game_info, no, question, hint, ${schema.soundQuestionColumn}, ${schema.imageQuestionColumn}, sound_hint, image_hint,
                            skill_listening_speaking, skill_lang_nature, skill_reading, skill_writing, audio_question, audio_choice, audio_assistant_voice, audio_background, expected_time
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                        RETURNING id
                        `,
                        [
                            newGameId,
                            sourceQuestion.no,
                            sourceQuestion.question,
                            sourceQuestion.hint,
                            sourceQuestion.sound_question,
                            sourceQuestion.image_question,
                            sourceQuestion.sound_hint,
                            sourceQuestion.image_hint,
                            sourceQuestion.skill_listening_speaking,
                            sourceQuestion.skill_lang_nature,
                            sourceQuestion.skill_reading,
                            sourceQuestion.skill_writing,
                            sourceQuestion.audio_question,
                            sourceQuestion.audio_choice,
                            sourceQuestion.audio_assistant_voice,
                            sourceQuestion.audio_background,
                            sourceQuestion.expected_time ?? 0,
                        ]
                    );

                    const newQuestionId = newQuestionRes.rows[0].id;

                    const sourceChoicesRes = await client.query(
                        `
                        SELECT choice, is_correct, sound_choice, image_choice
                        FROM complete_the_sentence_choice
                        WHERE id_complete_the_sentence_question = $1 AND delete_at IS NULL
                        ORDER BY id ASC
                        `,
                        [sourceQuestion.id]
                    );

                    for (const sourceChoice of sourceChoicesRes.rows) {
                        await client.query(
                            `
                            INSERT INTO complete_the_sentence_choice (
                                id_complete_the_sentence_question, choice, is_correct, sound_choice, image_choice
                            )
                            VALUES ($1, $2, $3, $4, $5)
                            `,
                            [
                                newQuestionId,
                                sourceChoice.choice,
                                sourceChoice.is_correct,
                                sourceChoice.sound_choice,
                                sourceChoice.image_choice,
                            ]
                        );
                        choicesCount += 1;
                    }
                }
            } else {
                const err: any = new Error('complete_the_sentence schema is not supported for clone');
                err.code = 'CLONE_UNSUPPORTED_COMPLETE_THE_SENTENCE_SCHEMA';
                throw err;
            }
        } else {
            const err: any = new Error('unsupported game_type');
            err.code = 'CLONE_UNSUPPORTED_GAME_TYPE';
            throw err;
        }

        await client.query(
            `
            INSERT INTO user_create_game_log (id_game_info, teacher_uuid)
            VALUES ($1, $2)
            `,
            [newGameId, teacherUuid]
        );

        await client.query('COMMIT');

        return {
            source_game_uuid: String(sourceGame.uuid),
            new_game_id: newGameId,
            new_game_uuid: String(newGame.uuid),
            game_type: newGame.game_type ?? null,
            copied_counts: {
                questions: questionsCount,
                choices: choicesCount,
                matchings: matchingsCount,
                anagrams: anagramsCount,
                situation_assets: situationAssetsCount,
            },
        };
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

export async function cloneGameTemplateBySourceUuidWithGameType(
    sourceUuidRaw: string,
    teacherUuidRaw: string,
    targetGameType: GameType
): Promise<CloneGameTemplateResult> {
    const categoryId = getCategoryIdFromGameType(targetGameType);
    if (categoryId === null) {
        const err: any = new Error('invalid target game_type');
        err.code = 'CLONE_INVALID_TARGET_GAME_TYPE';
        throw err;
    }

    const cloned = await cloneGameTemplateBySourceUuid(sourceUuidRaw, teacherUuidRaw);
    const updated = await updateGameTypeByGameUuid(cloned.new_game_uuid, targetGameType);

    if (!updated) {
        const err: any = new Error('failed to update cloned game_type');
        err.code = 'CLONE_UPDATE_GAME_TYPE_FAILED';
        throw err;
    }

    return {
        ...cloned,
        game_type: targetGameType,
    };
}

export async function updateGameStatusById(id: number, status: boolean) {
    if (!Number.isInteger(id) || id <= 0) {
        throw new Error('invalid id');
    }

    const text = `
        UPDATE game_info
        SET status = $1, update_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING id, uuid, teacher_uuid, exercise_name, status, update_at
    `;

    const res = await pool.query(text, [status, id]);
    if (res.rowCount === 0) {
        throw new Error('not found');
    }

    return res.rows[0];
}

export async function hardDeleteGameInfoById(id: number) {
    const text = `
        DELETE FROM game_info
        WHERE id = $1
        RETURNING id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, question_type, game_type, thumbnail, question_category_id, group_id, game_default, status, other_image, suggestion, create_at, delete_at
    `;
    const res = await pool.query(text, [id]);
    return res.rows[0];
}

export async function softDeleteBanGameInfoById(id: number) {
    const text = `
        UPDATE game_info
        SET ban_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, question_type, game_type, thumbnail, question_category_id, group_id, game_default, status, other_image, suggestion, create_at, delete_at, ban_at
    `;
    const res = await pool.query(text, [id]);
    return res.rows[0];
}

export async function restoreBanGameInfoById(id: number) {
    const text = `
        UPDATE game_info
        SET ban_at = NULL
        WHERE id = $1
        RETURNING id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, question_type, game_type, thumbnail, question_category_id, group_id, game_default, status, other_image, suggestion, create_at, delete_at, ban_at
    `;
    const res = await pool.query(text, [id]);
    return res.rows[0];
}

export async function updateGameTypeByGameUuid(gameUuid: string, gameType: GameType) {
    const categoryId = getCategoryIdFromGameType(gameType);

    const text = `
        UPDATE game_info
        SET game_type = $1,
            question_category_id = $2,
            update_at = CURRENT_TIMESTAMP
        WHERE uuid = $3 AND delete_at IS NULL
        RETURNING id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, question_type, game_type, thumbnail, question_category_id, group_id, game_default, status, other_image, suggestion, create_at, update_at, delete_at
    `;

    const res = await pool.query(text, [gameType, categoryId, gameUuid]);
    return res.rows[0] ?? null;
}

export async function updateThumbnailByGameUuid(gameUuid: string, thumbnail: string) {
    const text = `
        UPDATE game_info
        SET thumbnail = $1,
            update_at = CURRENT_TIMESTAMP
        WHERE uuid = $2 AND delete_at IS NULL
        RETURNING id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, question_type, game_type, thumbnail, question_category_id, group_id, game_default, status, other_image, suggestion, create_at, update_at, delete_at
    `;

    const res = await pool.query(text, [withUploadPrefix(thumbnail) ?? null, gameUuid]);
    return res.rows[0] ?? null;
}

export async function updateSubjectByGameUuid(gameUuid: string, subject: string) {
    const text = `
        UPDATE game_info
        SET subject = $1,
            update_at = CURRENT_TIMESTAMP
        WHERE uuid = $2 AND delete_at IS NULL
        RETURNING id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, question_type, game_type, thumbnail, question_category_id, group_id, game_default, status, other_image, suggestion, create_at, update_at, delete_at
    `;
    
    const res = await pool.query(text, [subject ?? null, gameUuid]);
    return res.rows[0] ?? null;
}

export async function updateGroupIdByGameUuid(gameUuid: string, groupId: number) {
    const text = `
        UPDATE game_info
        SET group_id = $1,
            update_at = CURRENT_TIMESTAMP
        WHERE uuid = $2 AND delete_at IS NULL
        RETURNING id, uuid, teacher_uuid, create_by, exercise_name, description, subject, class, question_type, game_type, thumbnail, question_category_id, group_id, game_default, status, other_image, suggestion, create_at, update_at, delete_at
    `;
    
    const res = await pool.query(text, [groupId, gameUuid]);
    return res.rows[0] ?? null;
}

function toBaseSkillPercent(value: unknown): number | null {
    return value === true ? 100 : null;
}

function toNumberOrNull(value: unknown): number | null {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

function extractTimeSecFromGameInformation(value: unknown): number | null {
    if (value === null || value === undefined) {
        return null;
    }

    let payload: any = value;
    if (typeof payload === 'string') {
        const trimmed = payload.trim();
        if (!trimmed) {
            return null;
        }
        try {
            payload = JSON.parse(trimmed);
        } catch {
            return null;
        }
    }

    if (typeof payload !== 'object' || Array.isArray(payload)) {
        return null;
    }

    return toNumberOrNull((payload as any).time_sec);
}

function parseSequenceGameInformationArray(value: unknown): any[] | null {
    if (value === null || value === undefined) {
        return null;
    }

    let payload: any = value;
    if (typeof payload === 'string') {
        const trimmed = payload.trim();
        if (!trimmed) {
            return null;
        }
        try {
            payload = JSON.parse(trimmed);
        } catch {
            return null;
        }
    }

    if (!Array.isArray(payload)) {
        return null;
    }

    return payload;
}

function findSequenceGameInformationItem(value: unknown, gameUuid: string): any | null {
    const payload = parseSequenceGameInformationArray(value);
    if (!payload) {
        return null;
    }

    const targetUuid = String(gameUuid || '').trim();
    if (!targetUuid) {
        return null;
    }

    const matchedGame = payload.find((item: any) =>
        item && typeof item === 'object' && String(item.uuid_game_info || '').trim() === targetUuid
    );

    return matchedGame ?? null;
}

function extractTimeSecFromSequenceGameInformation(value: unknown, gameUuid: string): number | null {
    const matchedGame = findSequenceGameInformationItem(value, gameUuid);
    if (!matchedGame) {
        return null;
    }

    return toNumberOrNull((matchedGame as any).time_sec);
}

type CapacityBundle = {
    skill_status: {
        skill_listening_speaking: boolean;
        skill_lang_nature: boolean;
        skill_reading: boolean;
        skill_writing: boolean;
    };
    capacity_percent: {
        skill_listening_speaking: number | null;
        skill_lang_nature: number | null;
        skill_reading: number | null;
        skill_writing: number | null;
    };
    capacity_meta: {
        question_no_used: number | null;
        live_dashboard_record_count: number;
        source_type: 'game' | 'sequence';
        sequence_game_count?: number;
    };
    per_game?: Array<{
        uuid_game_info: string;
        game_type: string;
        skill_status: {
            skill_listening_speaking: boolean;
            skill_lang_nature: boolean;
            skill_reading: boolean;
            skill_writing: boolean;
        };
        capacity_percent: {
            skill_listening_speaking: number | null;
            skill_lang_nature: number | null;
            skill_reading: number | null;
            skill_writing: number | null;
        };
        capacity_meta: {
            question_no_used: number | null;
            live_dashboard_record_count: number;
        };
    }>;
};

function buildCapacityFromQuestionAndPenalty(questionNo1: any, penaltyPercents: number[], dashboardRecordCount: number) {
    const baseSkillPercent = {
        skill_listening_speaking: toBaseSkillPercent(questionNo1?.skill_listening_speaking),
        skill_lang_nature: toBaseSkillPercent(questionNo1?.skill_lang_nature),
        skill_reading: toBaseSkillPercent(questionNo1?.skill_reading),
        skill_writing: toBaseSkillPercent(questionNo1?.skill_writing),
    };

    const skill_status = {
        skill_listening_speaking: questionNo1?.skill_listening_speaking === true,
        skill_lang_nature: questionNo1?.skill_lang_nature === true,
        skill_reading: questionNo1?.skill_reading === true,
        skill_writing: questionNo1?.skill_writing === true,
    };

    const capacity_percent = dashboardRecordCount === 0
        ? {
            skill_listening_speaking: null,
            skill_lang_nature: null,
            skill_reading: null,
            skill_writing: null,
        }
        : {
            skill_listening_speaking: averageSkillPercent(baseSkillPercent.skill_listening_speaking, penaltyPercents),
            skill_lang_nature: averageSkillPercent(baseSkillPercent.skill_lang_nature, penaltyPercents),
            skill_reading: averageSkillPercent(baseSkillPercent.skill_reading, penaltyPercents),
            skill_writing: averageSkillPercent(baseSkillPercent.skill_writing, penaltyPercents),
        };

    return {
        skill_status,
        capacity_percent,
    };
}

function parseGameInformationSafely(value: unknown): unknown {
    if (typeof value !== 'string') {
        return value;
    }

    const trimmed = value.trim();
    if (!trimmed) {
        return value;
    }

    try {
        return JSON.parse(trimmed);
    } catch {
        return value;
    }
}

function applyPenalty(basePercent: number | null, penaltyPercent: number): number | null {
    if (basePercent === null) {
        return null;
    }
    return Math.max(0, basePercent - penaltyPercent);
}

function averageSkillPercent(basePercent: number | null, penaltyPercents: number[]): number | null {
    if (basePercent === null) {
        return null;
    }

    if (penaltyPercents.length === 0) {
        return basePercent;
    }

    let sum = 0;
    for (const penaltyPercent of penaltyPercents) {
        sum += applyPenalty(basePercent, penaltyPercent) ?? 0;
    }

    return Math.round((sum / penaltyPercents.length) * 100) / 100;
}

function getPenaltyPercentByGameType(gameType: string, timeSec: number | null): number {
    switch (gameType) {
        case 'find_the_match':
            return getFindTheMatchPenaltyPercent(timeSec);
        case 'game_show_quiz':
            return getGameShowQuizPenaltyPercent(timeSec);
        case 'flip_cards':
            return getFlipCardsPenaltyPercent(timeSec);
        case 'air_plan/flying_fruits':
            return getAirPlanFlyingFruitsPenaltyPercent(timeSec);
        case 'flappy_bird':
            return getFlappyBirdPenaltyPercent(timeSec);
        case 'whack_a_mole':
            return getWhackAMolePenaltyPercent(timeSec);
        case 'anagram':
            return getAnagramPenaltyPercent(timeSec);
        case 'complete_the_sentence':
            return getCompleteTheSentencePenaltyPercent(timeSec);
        case 'situation':
            return getSituationPenaltyPercent(timeSec);
        default:
            return 0;
    }
}

async function buildCapacityByGameUuid(uuid: string, detailInput?: any): Promise<CapacityBundle> {
    const detail = detailInput ?? (uuid ? await findGameInfoByUuidWithQuestions(uuid) : null);

    if (detail && (detail as any).source === 'sequence' && Array.isArray((detail as any).games)) {
        const sequenceUuid = String((detail as any).sequence_info?.uuid || uuid || '').trim();
        const dashboardRes = await pool.query(
            `
            SELECT game_information
            FROM live_dashboard
            WHERE uuid_sequence_info = $1 AND delete_at IS NULL
            ORDER BY COALESCE(update_at, create_at) DESC, id DESC
            `,
            [sequenceUuid]
        );

        const dashboardRecordCount = dashboardRes.rows.length;

        const perGame = (detail as any).games.map((gameItem: any) => {
            const gameUuid = String(gameItem?.game_info?.uuid || '').trim();
            const gameType = String(gameItem?.game_info?.game_type || '');
            const questionNo1 = Array.isArray(gameItem?.questions)
                ? gameItem.questions.find((q: any) => Number(q?.no) === 1) ?? null
                : null;

            const penaltyPercents = dashboardRes.rows.map((row: any) => {
                const timeSec = extractTimeSecFromSequenceGameInformation(row?.game_information ?? null, gameUuid);
                return getPenaltyPercentByGameType(gameType, timeSec);
            });

            const gameCapacity = buildCapacityFromQuestionAndPenalty(questionNo1, penaltyPercents, dashboardRecordCount);

            return {
                uuid_game_info: gameUuid,
                game_type: gameType,
                ...gameCapacity,
                capacity_meta: {
                    question_no_used: questionNo1 ? 1 : null,
                    live_dashboard_record_count: dashboardRecordCount,
                },
            };
        });

        const avg = (key: 'skill_listening_speaking' | 'skill_lang_nature' | 'skill_reading' | 'skill_writing') => {
            const values = perGame
                .map((row: any) => row.capacity_percent[key])
                .filter((v: any): v is number => typeof v === 'number');

            if (values.length === 0) {
                return null;
            }

            return Math.round((values.reduce((acc: number, cur: number) => acc + cur, 0) / values.length) * 100) / 100;
        };

        return {
            skill_status: {
                skill_listening_speaking: perGame.some((row: any) => row.skill_status.skill_listening_speaking),
                skill_lang_nature: perGame.some((row: any) => row.skill_status.skill_lang_nature),
                skill_reading: perGame.some((row: any) => row.skill_status.skill_reading),
                skill_writing: perGame.some((row: any) => row.skill_status.skill_writing),
            },
            capacity_percent: {
                skill_listening_speaking: avg('skill_listening_speaking'),
                skill_lang_nature: avg('skill_lang_nature'),
                skill_reading: avg('skill_reading'),
                skill_writing: avg('skill_writing'),
            },
            capacity_meta: {
                question_no_used: perGame.some((row: any) => row.capacity_meta.question_no_used === 1) ? 1 : null,
                live_dashboard_record_count: dashboardRecordCount,
                source_type: 'sequence',
                sequence_game_count: perGame.length,
            },
            per_game: perGame,
        };
    }

    const questionNo1 = detail && (detail as any).source === 'game' && Array.isArray((detail as any).questions)
        ? (detail as any).questions.find((q: any) => Number(q?.no) === 1) ?? null
        : null;

    const gameType = detail && (detail as any).source === 'game'
        ? String((detail as any).game_info?.game_type || '')
        : '';

    const gameQueryUuid = detail && (detail as any).source === 'game'
        ? String((detail as any).game_info?.uuid || uuid).trim()
        : uuid;

    const dashboardRes = await pool.query(
        `
                SELECT uuid_game_info, game_information
        FROM live_dashboard
                WHERE delete_at IS NULL
                    AND (
                        uuid_game_info = $1
                        OR (
                            uuid_sequence_info IS NOT NULL
                            AND game_information ILIKE '%' || $1 || '%'
                        )
                    )
        ORDER BY COALESCE(update_at, create_at) DESC, id DESC
        `,
        [gameQueryUuid]
    );

        const penaltyPercents: number[] = [];
        for (const row of dashboardRes.rows as any[]) {
                const rowGameUuid = String(row?.uuid_game_info || '').trim();

                if (rowGameUuid && rowGameUuid === gameQueryUuid) {
                        const timeSec = extractTimeSecFromGameInformation(row?.game_information ?? null);
                        penaltyPercents.push(getPenaltyPercentByGameType(gameType, timeSec));
                        continue;
                }

                const matchedItem = findSequenceGameInformationItem(row?.game_information ?? null, gameQueryUuid);
                if (!matchedItem) {
                        continue;
                }

                const timeSec = toNumberOrNull((matchedItem as any).time_sec);
                penaltyPercents.push(getPenaltyPercentByGameType(gameType, timeSec));
        }

        const dashboardRecordCount = penaltyPercents.length;
    const gameCapacity = buildCapacityFromQuestionAndPenalty(questionNo1, penaltyPercents, dashboardRecordCount);

    return {
        ...gameCapacity,
        capacity_meta: {
            question_no_used: questionNo1 ? 1 : null,
            live_dashboard_record_count: dashboardRecordCount,
            source_type: 'game',
        },
    };
}

export async function findAllGamesByPlayCountDesc() {
    const text = `
        SELECT
            g.id,
            g.uuid,
            g.teacher_uuid,
            g.exercise_name,
            g.play_count,
            COALESCE(ld.student_played_count, 0) AS student_played_count
        FROM game_info g
        LEFT JOIN (
            SELECT uuid_game_info, COUNT(*)::int AS student_played_count
            FROM live_dashboard
            WHERE delete_at IS NULL
            GROUP BY uuid_game_info
        ) ld ON ld.uuid_game_info = g.uuid
        WHERE g.game_default = true AND g.delete_at IS NULL
        ORDER BY g.play_count DESC, g.id ASC
    `;

    const res = await pool.query(text);

    const gameUuids = res.rows
        .map((row: any) => String(row.uuid || '').trim())
        .filter((uuid: string) => uuid.length > 0);

    const studentSetByGameUuid = new Map<string, Set<string>>();
    for (const gameUuid of gameUuids) {
        studentSetByGameUuid.set(gameUuid, new Set<string>());
    }

    const dashboardRes = await pool.query(
        `
        SELECT student_uuid, uuid_game_info, game_information
        FROM live_dashboard
        WHERE delete_at IS NULL
        `
    );

    for (const row of dashboardRes.rows as any[]) {
        const studentUuid = String(row?.student_uuid || '').trim();
        if (!studentUuid) {
            continue;
        }

        const directGameUuid = String(row?.uuid_game_info || '').trim();
        if (directGameUuid && studentSetByGameUuid.has(directGameUuid)) {
            studentSetByGameUuid.get(directGameUuid)?.add(studentUuid);
            continue;
        }

        const gamesFromSequence = parseSequenceGameInformationArray(row?.game_information ?? null);
        if (!gamesFromSequence) {
            continue;
        }

        for (const gameItem of gamesFromSequence) {
            const sequenceGameUuid = String(gameItem?.uuid_game_info || '').trim();
            if (!sequenceGameUuid || !studentSetByGameUuid.has(sequenceGameUuid)) {
                continue;
            }
            studentSetByGameUuid.get(sequenceGameUuid)?.add(studentUuid);
        }
    }

    const enrichedRows = await Promise.all(
        res.rows.map(async (game: any) => {
            const uuid = String(game.uuid || '').trim();
            const capacity = await buildCapacityByGameUuid(uuid);
            return {
                ...game,
                student_played_count: studentSetByGameUuid.get(uuid)?.size ?? 0,
                ...capacity,
            };
        })
    );

    return enrichedRows;
}

export async function findAllGamesExceptGameDefaultByPlayCountDesc() {
    const text = `
        SELECT
            g.id,
            g.uuid,
            g.teacher_uuid,
            g.create_by,
            g.exercise_name,
            g.description,
            g.subject,
            g.question_type,
            g.thumbnail,
            g.question_category_id,
            g.game_type,
            g.group_id,
            g.play_count,
            g.create_at,
            g.update_at,
            g.delete_at,
            COALESCE(ld.student_played_count, 0) AS student_played_count
        FROM game_info g
        LEFT JOIN (
            SELECT uuid_game_info, COUNT(*)::int AS student_played_count
            FROM live_dashboard
            WHERE delete_at IS NULL
            GROUP BY uuid_game_info
        ) ld ON ld.uuid_game_info = g.uuid
        WHERE g.delete_at IS NULL
        ORDER BY g.play_count DESC, g.id ASC
    `;

    const res = await pool.query(text);

    const gameUuids = res.rows
        .map((row: any) => String(row.uuid || '').trim())
        .filter((uuid: string) => uuid.length > 0);

    const studentSetByGameUuid = new Map<string, Set<string>>();
    for (const gameUuid of gameUuids) {
        studentSetByGameUuid.set(gameUuid, new Set<string>());
    }

    const dashboardRes = await pool.query(
        `
        SELECT student_uuid, uuid_game_info, game_information
        FROM live_dashboard
        WHERE delete_at IS NULL
        `
    );

    for (const row of dashboardRes.rows as any[]) {
        const studentUuid = String(row?.student_uuid || '').trim();
        if (!studentUuid) {
            continue;
        }

        const directGameUuid = String(row?.uuid_game_info || '').trim();
        if (directGameUuid && studentSetByGameUuid.has(directGameUuid)) {
            studentSetByGameUuid.get(directGameUuid)?.add(studentUuid);
            continue;
        }

        const gamesFromSequence = parseSequenceGameInformationArray(row?.game_information ?? null);
        if (!gamesFromSequence) {
            continue;
        }

        for (const gameItem of gamesFromSequence) {
            const sequenceGameUuid = String(gameItem?.uuid_game_info || '').trim();
            if (!sequenceGameUuid || !studentSetByGameUuid.has(sequenceGameUuid)) {
                continue;
            }
            studentSetByGameUuid.get(sequenceGameUuid)?.add(studentUuid);
        }
    }

    const mapped = res.rows.map((game: any) => {
        const uuid = String(game.uuid || '').trim();
        return {
            ...game,
            student_played_count: studentSetByGameUuid.get(uuid)?.size ?? 0,
        };
    });

    mapped.sort((a: any, b: any) => {
        const aStudents = Number(a.student_played_count || 0);
        const bStudents = Number(b.student_played_count || 0);
        if (bStudents !== aStudents) return bStudents - aStudents;

        const aPlay = Number(a.play_count || 0);
        const bPlay = Number(b.play_count || 0);
        if (bPlay !== aPlay) return bPlay - aPlay;

        const aId = Number(a.id || 0);
        const bId = Number(b.id || 0);
        return aId - bId;
    });

    return mapped;
}

export async function getLiveDashboardGamesCapacityAverage() {
    const dashboardRes = await pool.query(
        `
        SELECT uuid_game_info, game_information
        FROM live_dashboard
        WHERE delete_at IS NULL
        `
    );

    const uuidSet = new Set<string>();
    for (const row of dashboardRes.rows as any[]) {
        const directGameUuid = String(row?.uuid_game_info || '').trim();
        if (directGameUuid) {
            uuidSet.add(directGameUuid);
        }

        const sequenceGames = parseSequenceGameInformationArray(row?.game_information ?? null);
        if (!sequenceGames) {
            continue;
        }

        for (const gameItem of sequenceGames) {
            const sequenceGameUuid = String(gameItem?.uuid_game_info || '').trim();
            if (sequenceGameUuid) {
                uuidSet.add(sequenceGameUuid);
            }
        }
    }

    const uuids = Array.from(uuidSet).sort((a, b) => a.localeCompare(b));

    const perGameRows = await Promise.all(
        uuids.map(async (uuid) => {
            const capacity = await buildCapacityByGameUuid(uuid);
            return {
                uuid_game_info: uuid,
                ...capacity,
            };
        })
    );

    const avg = (key: 'skill_listening_speaking' | 'skill_lang_nature' | 'skill_reading' | 'skill_writing') => {
        const values = perGameRows
            .map((row) => row.capacity_percent[key])
            .filter((v): v is number => typeof v === 'number');

        if (values.length === 0) {
            return null;
        }

        return Math.round((values.reduce((acc, cur) => acc + cur, 0) / values.length) * 100) / 100;
    };

    return {
        games_count: perGameRows.length,
        capacity_percent: {
            skill_listening_speaking: avg('skill_listening_speaking'),
            skill_lang_nature: avg('skill_lang_nature'),
            skill_reading: avg('skill_reading'),
            skill_writing: avg('skill_writing'),
        },
        per_game: perGameRows,
    };
}

function resolveLiveDashboardQueryUuid(inputUuid: string, detail: any | null | undefined): string {
    if (detail && (detail as any).source === 'sequence') {
        return String((detail as any).sequence_info?.uuid || inputUuid).trim();
    }

    if (detail && (detail as any).source === 'game') {
        return String((detail as any).game_info?.uuid || inputUuid).trim();
    }

    return inputUuid;
}

export async function getLiveDashboardCapacityByGameUuid(uuidGameInfoRaw: string) {
    const inputUuid = String(uuidGameInfoRaw || '').trim();
    if (!inputUuid) {
        throw new Error('uuid_required');
    }

    const detail = await findGameInfoByUuidWithQuestions(inputUuid);
    const queryUuid = resolveLiveDashboardQueryUuid(inputUuid, detail);
    const capacity = await buildCapacityByGameUuid(inputUuid, detail);

    const isSequenceSource = detail && (detail as any).source === 'sequence';

    let dashboardRes;
    if (isSequenceSource) {
        dashboardRes = await pool.query(
            `
            SELECT id, student_uuid, student_name, uuid_sequence_info, uuid_game_info, game_information, create_at, update_at
            FROM live_dashboard
            WHERE uuid_sequence_info = $1 AND delete_at IS NULL
            ORDER BY COALESCE(update_at, create_at) DESC, id DESC
            `,
            [queryUuid]
        );
    } else {
        dashboardRes = await pool.query(
            `
            SELECT id, student_uuid, student_name, uuid_sequence_info, uuid_game_info, game_information, create_at, update_at
            FROM live_dashboard
            WHERE delete_at IS NULL
              AND (
                uuid_game_info = $1
                OR (
                    uuid_sequence_info IS NOT NULL
                    AND game_information ILIKE '%' || $1 || '%'
                )
              )
            ORDER BY COALESCE(update_at, create_at) DESC, id DESC
            `,
            [queryUuid]
        );
    }

    const liveDashboardRows = (dashboardRes.rows as any[]).filter((row) => {
        if (isSequenceSource) {
            return true;
        }

        const directGameUuid = String(row?.uuid_game_info || '').trim();
        if (directGameUuid === queryUuid) {
            return true;
        }

        return !!findSequenceGameInformationItem(row?.game_information ?? null, queryUuid);
    });

    const liveDashboard = liveDashboardRows.map((row: any) => ({
        id: row.id,
        student_uuid: row.student_uuid,
        student_name: row.student_name ?? null,
        uuid_sequence_info: row.uuid_sequence_info ?? null,
        uuid_game_info: row.uuid_game_info ?? null,
        game_information: parseGameInformationSafely(row.game_information),
        create_at: row.create_at,
        update_at: row.update_at,
    }));

    return {
        uuid: inputUuid,
        ...capacity,
        live_dashboard: liveDashboard,
    };
}

export async function countAllGamesExceptGameDefault() {
    const text = `
        SELECT COUNT(*) AS count
        FROM game_info
        WHERE game_default = false AND delete_at IS NULL
    `;
    const res = await pool.query(text);
    return res.rows[0]?.count ?? 0;
}

export async function getAllUserCreatedGameLogs() {
    const text = `
        SELECT
            l.id,
            l.id_game_info,
            l.teacher_uuid,
            g.exercise_name,
            t.name AS teacher_name,
            l.create_at
        FROM user_create_game_log l
        LEFT JOIN game_info g ON g.id = l.id_game_info
        LEFT JOIN teacher t ON t.uuid = l.teacher_uuid
        WHERE l.delete_at IS NULL
        ORDER BY l.create_at DESC
    `;
    const res = await pool.query(text);
    return res.rows;
}

export async function getAllGameTypePopularCreateGameRanking() {
    const text = `
        SELECT
            g.game_type,
            COUNT(g.id) AS create_game_count
        FROM game_info g
        WHERE g.game_default = false AND g.delete_at IS NULL
        GROUP BY g.game_type
        ORDER BY create_game_count DESC
    `;
    const res = await pool.query(text);
    return res.rows;
}

function getFindTheMatchPenaltyPercent(timeSec: number | null): number {
    if (timeSec === null) {
        return 0;
    }

    if (timeSec < 5) return 0;
    if (timeSec <= 10) return 3;
    if (timeSec <= 15) return 6;
    if (timeSec <= 20) return 9;
    if (timeSec <= 25) return 12;
    if (timeSec <= 30) return 15;
    if (timeSec <= 35) return 18;
    if (timeSec <= 40) return 21;
    if (timeSec <= 45) return 24;
    if (timeSec <= 50) return 27;
    if (timeSec <= 55) return 30;
    if (timeSec <= 60) return 33;
    if (timeSec <= 65) return 36;
    if (timeSec <= 70) return 39;
    if (timeSec <= 75) return 42;
    if (timeSec <= 80) return 45;
    if (timeSec <= 85) return 48;
    if (timeSec <= 90) return 51;
    if (timeSec <= 95) return 54;
    if (timeSec <= 100) return 57;
    if (timeSec <= 105) return 60;
    if (timeSec <= 110) return 63;
    if (timeSec <= 115) return 66;
    if (timeSec <= 120) return 69;
    if (timeSec <= 125) return 72;
    if (timeSec <= 130) return 75;
    if (timeSec <= 135) return 78;
    if (timeSec <= 140) return 81;
    if (timeSec <= 145) return 84;
    if (timeSec <= 150) return 87;
    if (timeSec <= 155) return 90;
    if (timeSec <= 160) return 93;
    if (timeSec <= 165) return 96;
    return 99;
}

function getGameShowQuizPenaltyPercent(timeSec: number | null): number {
    if (timeSec === null) {
        return 0;
    }

    if (timeSec < 5) return 0;
    if (timeSec <= 10) return 3;
    if (timeSec <= 15) return 6;
    if (timeSec <= 20) return 9;
    if (timeSec <= 25) return 12;
    if (timeSec <= 30) return 15;
    if (timeSec <= 35) return 18;
    if (timeSec <= 40) return 21;
    if (timeSec <= 45) return 24;
    if (timeSec <= 50) return 27;
    if (timeSec <= 55) return 30;
    if (timeSec <= 60) return 33;
    if (timeSec <= 65) return 36;
    if (timeSec <= 70) return 39;
    if (timeSec <= 75) return 42;
    if (timeSec <= 80) return 45;
    if (timeSec <= 85) return 48;
    if (timeSec <= 90) return 51;
    if (timeSec <= 95) return 54;
    if (timeSec <= 100) return 57;
    if (timeSec <= 105) return 60;
    if (timeSec <= 110) return 63;
    if (timeSec <= 115) return 66;
    if (timeSec <= 120) return 69;
    if (timeSec <= 125) return 72;
    if (timeSec <= 130) return 75;
    if (timeSec <= 135) return 78;
    if (timeSec <= 140) return 81;
    if (timeSec <= 145) return 84;
    if (timeSec <= 150) return 87;
    if (timeSec <= 155) return 90;
    if (timeSec <= 160) return 93;
    if (timeSec <= 165) return 96;
    return 99;
}

function getFlipCardsPenaltyPercent(timeSec: number | null): number {
    if (timeSec === null) {
        return 0;
    }

    if (timeSec < 5) return 0;
    if (timeSec <= 10) return 3;
    if (timeSec <= 15) return 6;
    if (timeSec <= 20) return 9;
    if (timeSec <= 25) return 12;
    if (timeSec <= 30) return 15;
    if (timeSec <= 35) return 18;
    if (timeSec <= 40) return 21;
    if (timeSec <= 45) return 24;
    if (timeSec <= 50) return 27;
    if (timeSec <= 55) return 30;
    if (timeSec <= 60) return 33;
    if (timeSec <= 65) return 36;
    if (timeSec <= 70) return 39;
    if (timeSec <= 75) return 42;
    if (timeSec <= 80) return 45;
    if (timeSec <= 85) return 48;
    if (timeSec <= 90) return 51;
    if (timeSec <= 95) return 54;
    if (timeSec <= 100) return 57;
    if (timeSec <= 105) return 60;
    if (timeSec <= 110) return 63;
    if (timeSec <= 115) return 66;
    if (timeSec <= 120) return 69;
    if (timeSec <= 125) return 72;
    if (timeSec <= 130) return 75;
    if (timeSec <= 135) return 78;
    if (timeSec <= 140) return 81;
    if (timeSec <= 145) return 84;
    if (timeSec <= 150) return 87;
    if (timeSec <= 155) return 90;
    if (timeSec <= 160) return 93;
    if (timeSec <= 165) return 96;
    return 99;
}

function getAirPlanFlyingFruitsPenaltyPercent(timeSec: number | null): number {
    if (timeSec === null) {
        return 0;
    }

    if (timeSec < 5) return 0;
    if (timeSec <= 10) return 3;
    if (timeSec <= 15) return 6;
    if (timeSec <= 20) return 9;
    if (timeSec <= 25) return 12;
    if (timeSec <= 30) return 15;
    if (timeSec <= 35) return 18;
    if (timeSec <= 40) return 21;
    if (timeSec <= 45) return 24;
    if (timeSec <= 50) return 27;
    if (timeSec <= 55) return 30;
    if (timeSec <= 60) return 33;
    if (timeSec <= 65) return 36;
    if (timeSec <= 70) return 39;
    if (timeSec <= 75) return 42;
    if (timeSec <= 80) return 45;
    if (timeSec <= 85) return 48;
    if (timeSec <= 90) return 51;
    if (timeSec <= 95) return 54;
    if (timeSec <= 100) return 57;
    if (timeSec <= 105) return 60;
    if (timeSec <= 110) return 63;
    if (timeSec <= 115) return 66;
    if (timeSec <= 120) return 69;
    if (timeSec <= 125) return 72;
    if (timeSec <= 130) return 75;
    if (timeSec <= 135) return 78;
    if (timeSec <= 140) return 81;
    if (timeSec <= 145) return 84;
    if (timeSec <= 150) return 87;
    if (timeSec <= 155) return 90;
    if (timeSec <= 160) return 93;
    if (timeSec <= 165) return 96;
    return 99;
}

function getFlappyBirdPenaltyPercent(timeSec: number | null): number {
    if (timeSec === null) {
        return 0;
    }

    if (timeSec < 5) return 0;
    if (timeSec <= 10) return 3;
    if (timeSec <= 15) return 6;
    if (timeSec <= 20) return 9;
    if (timeSec <= 25) return 12;
    if (timeSec <= 30) return 15;
    if (timeSec <= 35) return 18;
    if (timeSec <= 40) return 21;
    if (timeSec <= 45) return 24;
    if (timeSec <= 50) return 27;
    if (timeSec <= 55) return 30;
    if (timeSec <= 60) return 33;
    if (timeSec <= 65) return 36;
    if (timeSec <= 70) return 39;
    if (timeSec <= 75) return 42;
    if (timeSec <= 80) return 45;
    if (timeSec <= 85) return 48;
    if (timeSec <= 90) return 51;
    if (timeSec <= 95) return 54;
    if (timeSec <= 100) return 57;
    if (timeSec <= 105) return 60;
    if (timeSec <= 110) return 63;
    if (timeSec <= 115) return 66;
    if (timeSec <= 120) return 69;
    if (timeSec <= 125) return 72;
    if (timeSec <= 130) return 75;
    if (timeSec <= 135) return 78;
    if (timeSec <= 140) return 81;
    if (timeSec <= 145) return 84;
    if (timeSec <= 150) return 87;
    if (timeSec <= 155) return 90;
    if (timeSec <= 160) return 93;
    if (timeSec <= 165) return 96;
    return 99;
}

function getWhackAMolePenaltyPercent(timeSec: number | null): number {
    if (timeSec === null) {
        return 0;
    }

    if (timeSec < 5) return 0;
    if (timeSec <= 10) return 3;
    if (timeSec <= 15) return 6;
    if (timeSec <= 20) return 9;
    if (timeSec <= 25) return 12;
    if (timeSec <= 30) return 15;
    if (timeSec <= 35) return 18;
    if (timeSec <= 40) return 21;
    if (timeSec <= 45) return 24;
    if (timeSec <= 50) return 27;
    if (timeSec <= 55) return 30;
    if (timeSec <= 60) return 33;
    if (timeSec <= 65) return 36;
    if (timeSec <= 70) return 39;
    if (timeSec <= 75) return 42;
    if (timeSec <= 80) return 45;
    if (timeSec <= 85) return 48;
    if (timeSec <= 90) return 51;
    if (timeSec <= 95) return 54;
    if (timeSec <= 100) return 57;
    if (timeSec <= 105) return 60;
    if (timeSec <= 110) return 63;
    if (timeSec <= 115) return 66;
    if (timeSec <= 120) return 69;
    if (timeSec <= 125) return 72;
    if (timeSec <= 130) return 75;
    if (timeSec <= 135) return 78;
    if (timeSec <= 140) return 81;
    if (timeSec <= 145) return 84;
    if (timeSec <= 150) return 87;
    if (timeSec <= 155) return 90;
    if (timeSec <= 160) return 93;
    if (timeSec <= 165) return 96;
    return 99;
}

function getAnagramPenaltyPercent(timeSec: number | null): number {
    if (timeSec === null) {
        return 0;
    }

    if (timeSec < 5) return 0;
    if (timeSec <= 10) return 3;
    if (timeSec <= 15) return 6;
    if (timeSec <= 20) return 9;
    if (timeSec <= 25) return 12;
    if (timeSec <= 30) return 15;
    if (timeSec <= 35) return 18;
    if (timeSec <= 40) return 21;
    if (timeSec <= 45) return 24;
    if (timeSec <= 50) return 27;
    if (timeSec <= 55) return 30;
    if (timeSec <= 60) return 33;
    if (timeSec <= 65) return 36;
    if (timeSec <= 70) return 39;
    if (timeSec <= 75) return 42;
    if (timeSec <= 80) return 45;
    if (timeSec <= 85) return 48;
    if (timeSec <= 90) return 51;
    if (timeSec <= 95) return 54;
    if (timeSec <= 100) return 57;
    if (timeSec <= 105) return 60;
    if (timeSec <= 110) return 63;
    if (timeSec <= 115) return 66;
    if (timeSec <= 120) return 69;
    if (timeSec <= 125) return 72;
    if (timeSec <= 130) return 75;
    if (timeSec <= 135) return 78;
    if (timeSec <= 140) return 81;
    if (timeSec <= 145) return 84;
    if (timeSec <= 150) return 87;
    if (timeSec <= 155) return 90;
    if (timeSec <= 160) return 93;
    if (timeSec <= 165) return 96;
    return 99;
}

function getCompleteTheSentencePenaltyPercent(timeSec: number | null): number {
    if (timeSec === null) {
        return 0;
    }

    if (timeSec < 5) return 0;
    if (timeSec <= 10) return 3;
    if (timeSec <= 15) return 6;
    if (timeSec <= 20) return 9;
    if (timeSec <= 25) return 12;
    if (timeSec <= 30) return 15;
    if (timeSec <= 35) return 18;
    if (timeSec <= 40) return 21;
    if (timeSec <= 45) return 24;
    if (timeSec <= 50) return 27;
    if (timeSec <= 55) return 30;
    if (timeSec <= 60) return 33;
    if (timeSec <= 65) return 36;
    if (timeSec <= 70) return 39;
    if (timeSec <= 75) return 42;
    if (timeSec <= 80) return 45;
    if (timeSec <= 85) return 48;
    if (timeSec <= 90) return 51;
    if (timeSec <= 95) return 54;
    if (timeSec <= 100) return 57;
    if (timeSec <= 105) return 60;
    if (timeSec <= 110) return 63;
    if (timeSec <= 115) return 66;
    if (timeSec <= 120) return 69;
    if (timeSec <= 125) return 72;
    if (timeSec <= 130) return 75;
    if (timeSec <= 135) return 78;
    if (timeSec <= 140) return 81;
    if (timeSec <= 145) return 84;
    if (timeSec <= 150) return 87;
    if (timeSec <= 155) return 90;
    if (timeSec <= 160) return 93;
    if (timeSec <= 165) return 96;
    return 99;
}

function getSituationPenaltyPercent(timeSec: number | null): number {
    if (timeSec === null) {
        return 0;
    }

    if (timeSec < 5) return 0;
    if (timeSec <= 10) return 3;
    if (timeSec <= 15) return 6;
    if (timeSec <= 20) return 9;
    if (timeSec <= 25) return 12;
    if (timeSec <= 30) return 15;
    if (timeSec <= 35) return 18;
    if (timeSec <= 40) return 21;
    if (timeSec <= 45) return 24;
    if (timeSec <= 50) return 27;
    if (timeSec <= 55) return 30;
    if (timeSec <= 60) return 33;
    if (timeSec <= 65) return 36;
    if (timeSec <= 70) return 39;
    if (timeSec <= 75) return 42;
    if (timeSec <= 80) return 45;
    if (timeSec <= 85) return 48;
    if (timeSec <= 90) return 51;
    if (timeSec <= 95) return 54;
    if (timeSec <= 100) return 57;
    if (timeSec <= 105) return 60;
    if (timeSec <= 110) return 63;
    if (timeSec <= 115) return 66;
    if (timeSec <= 120) return 69;
    if (timeSec <= 125) return 72;
    if (timeSec <= 130) return 75;
    if (timeSec <= 135) return 78;
    if (timeSec <= 140) return 81;
    if (timeSec <= 145) return 84;
    if (timeSec <= 150) return 87;
    if (timeSec <= 155) return 90;
    if (timeSec <= 160) return 93;
    if (timeSec <= 165) return 96;
    return 99;
}