import { Request, Response } from "express";
import {
    upsertLiveDashboard,
    getAllLiveDashboards,
    getLiveDashboardById,
    getLiveDashboardsByTeacherUuid,
    getLiveDashboardsByStudentUuid,
    getLiveDashboardStudentsByGameOrSequence,
} from "../services/live_dashboard.service";

function isValidUuid(value: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
}

export async function liveDashboardController(req: Request, res: Response) {
    try {
        const teacher_uuid_raw = req.body?.teacher_uuid;
        const student_uuid_raw = req.body?.student_uuid;
        const student_name_raw = req.body?.student_name;
        const sequence_raw = req.body?.uuid_sequence_info;
        const game_uuid_raw = req.body?.uuid_game_info;
        const gameInformationRaw = req.body?.game_information;

        const teacher_uuid = teacher_uuid_raw === undefined || teacher_uuid_raw === null || String(teacher_uuid_raw).trim() === ''
            ? null
            : String(teacher_uuid_raw).trim();

        if (teacher_uuid && !isValidUuid(teacher_uuid)) {
            return res.status(400).json({ error: 'invalid_teacher_uuid' });
        }

        const student_uuid = String(student_uuid_raw ?? '').trim();
        if (!student_uuid) {
            return res.status(400).json({ error: 'student_uuid_required' });
        }
        if (!isValidUuid(student_uuid)) {
            return res.status(400).json({ error: 'invalid_student_uuid' });
        }

        const uuid_game_info = game_uuid_raw === undefined || game_uuid_raw === null || String(game_uuid_raw).trim() === ''
            ? null
            : String(game_uuid_raw).trim();

        if (uuid_game_info && !isValidUuid(uuid_game_info)) {
            return res.status(400).json({ error: 'invalid_uuid_game_info' });
        }

        const uuid_sequence_info = sequence_raw === undefined || sequence_raw === null || String(sequence_raw).trim() === ''
            ? null
            : String(sequence_raw).trim();

        if (uuid_sequence_info && !isValidUuid(uuid_sequence_info)) {
            return res.status(400).json({ error: 'invalid_uuid_sequence_info' });
        }

        if (!uuid_sequence_info && !uuid_game_info) {
            return res.status(400).json({ error: 'uuid_sequence_info_or_uuid_game_info_required' });
        }

        if (gameInformationRaw === undefined || gameInformationRaw === null) {
            return res.status(400).json({ error: 'game_information_required' });
        }

        let normalizedGameInformation: string | Record<string, unknown> | unknown[];
        if (typeof gameInformationRaw === 'string') {
            const trimmed = gameInformationRaw.trim();
            if (!trimmed) {
                return res.status(400).json({ error: 'game_information_required' });
            }

            try {
                normalizedGameInformation = JSON.parse(trimmed) as Record<string, unknown> | unknown[];
            } catch {
                normalizedGameInformation = gameInformationRaw;
            }
        } else if (typeof gameInformationRaw === 'object') {
            normalizedGameInformation = gameInformationRaw as Record<string, unknown> | unknown[];
        } else {
            return res.status(400).json({ error: 'game_information_must_be_json_string_or_object' });
        }

        const student_name = student_name_raw === undefined || student_name_raw === null
            ? null
            : String(student_name_raw).trim();

        const result = await upsertLiveDashboard({
            teacher_uuid,
            student_uuid,
            student_name,
            uuid_sequence_info,
            uuid_game_info,
            game_information: normalizedGameInformation,
        });

        return res.status(200).json({
            message: 'dashboard_submitted',
            data: result,
        });
    } catch (err: any) {
        if (err?.code === 'LIVE_DASHBOARD_UUID_REQUIRED') {
            return res.status(400).json({ error: 'uuid_sequence_info_or_uuid_game_info_required' });
        }

        if (err?.code === '23503') {
            const detail = String(err?.detail || '');
            if (detail.includes('uuid_sequence_info')) {
                return res.status(404).json({ error: 'sequence_info_uuid_not_found' });
            }
            if (detail.includes('uuid_game_info')) {
                return res.status(404).json({ error: 'game_info_uuid_not_found' });
            }
            return res.status(404).json({ error: 'foreign_key_not_found' });
        }

        if (err?.code === '23505') {
            return res.status(409).json({
                error: 'duplicate_live_dashboard_key',
                detail: String(err?.detail || ''),
            });
        }

        if (err?.code === '42703') {
            return res.status(500).json({
                error: 'column_not_found',
                detail: String(err?.message || 'invalid_column_name'),
            });
        }

        if (err?.code === '42P01') {
            return res.status(500).json({
                error: 'table_not_found',
                detail: 'live_dashboard_table_missing',
            });
        }

        console.error('liveDashboardController error', err);
        return res.status(500).json({
            error: 'internal server error',
            db_code: err?.code || null,
            detail: String(err?.message || ''),
        });
    }
}

export async function getAllLiveDashboardsController(req: Request, res: Response) {
    try {
        const dashboards = await getAllLiveDashboards();
        return res.status(200).json({
            message: 'dashboards_retrieved',
            data: dashboards,
        });
    } catch (err: any) {
        console.error('getAllLiveDashboardsController error', err);
        return res.status(500).json({
            error: 'internal server error',
            db_code: err?.code || null,
            detail: String(err?.message || ''),
        });
    }
}

export async function getLiveDashboardByIdController(req: Request, res: Response) {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: 'id_required' });
    }

    const dashboardId = Number(id);
    if (isNaN(dashboardId)) {
        return res.status(400).json({ error: 'invalid_id' });
    }

    try {
        const dashboard = await getLiveDashboardById(dashboardId);
        if (!dashboard) {
            return res.status(404).json({ error: 'dashboard_not_found' });
        }
        return res.status(200).json({
            message: 'dashboard_retrieved',
            data: dashboard,
        });
    } catch (err: any) {
        console.error('getLiveDashboardByIdController error', err);
        return res.status(500).json({
            error: 'internal server error',
            db_code: err?.code || null,
            detail: String(err?.message || ''),
        });
    }
}

export async function getLiveDashboardsByTeacherUuidController(req: Request, res: Response) {
    const { teacher_uuid } = req.params;
    if (!teacher_uuid) {
        return res.status(400).json({ error: 'teacher_uuid_required' });
    }
    if (!isValidUuid(teacher_uuid)) {
        return res.status(400).json({ error: 'invalid_teacher_uuid' });
    }

    try {
        const dashboards = await getLiveDashboardsByTeacherUuid(teacher_uuid);
        return res.status(200).json({
            message: 'dashboards_retrieved',
            data: dashboards,
        });
    }
    catch (err: any) {
        console.error('getLiveDashboardsByTeacherUuidController error', err);
        return res.status(500).json({
            error: 'internal server error',
            db_code: err?.code || null,
            detail: String(err?.message || ''),
        });
    }
}

export async function getLiveDashboardsByStudentUuidController(req: Request, res: Response) {
    const { student_uuid } = req.params;
    if (!student_uuid) {
        return res.status(400).json({ error: 'student_uuid_required' });
    }
    if (!isValidUuid(student_uuid)) {
        return res.status(400).json({ error: 'invalid_student_uuid' });
    }

    try {
        const dashboards = await getLiveDashboardsByStudentUuid(student_uuid);
        return res.status(200).json({
            message: 'dashboards_retrieved',
            data: dashboards,
        });
    } catch (err: any) {
        console.error('getLiveDashboardsByStudentUuidController error', err);
        return res.status(500).json({
            error: 'internal server error',
            db_code: err?.code || null,
            detail: String(err?.message || ''),
        });
    }
}

export async function getLiveDashboardStudentsByGameOrSequenceController(req: Request, res: Response) {
    const uuid_game_info_raw = req.query?.uuid_game_info;
    const uuid_sequence_info_raw = req.query?.uuid_sequence_info;

    const uuid_game_info = uuid_game_info_raw === undefined || uuid_game_info_raw === null || String(uuid_game_info_raw).trim() === ''
        ? null
        : String(uuid_game_info_raw).trim();

    const uuid_sequence_info = uuid_sequence_info_raw === undefined || uuid_sequence_info_raw === null || String(uuid_sequence_info_raw).trim() === ''
        ? null
        : String(uuid_sequence_info_raw).trim();

    if (!uuid_game_info && !uuid_sequence_info) {
        return res.status(400).json({ error: 'uuid_game_info_or_uuid_sequence_info_required' });
    }

    if (uuid_game_info && !isValidUuid(uuid_game_info)) {
        return res.status(400).json({ error: 'invalid_uuid_game_info' });
    }

    if (uuid_sequence_info && !isValidUuid(uuid_sequence_info)) {
        return res.status(400).json({ error: 'invalid_uuid_sequence_info' });
    }

    try {
        const students = await getLiveDashboardStudentsByGameOrSequence({
            uuid_game_info,
            uuid_sequence_info,
        });

        return res.status(200).json({
            message: 'live_dashboard_students_retrieved',
            data: students,
        });
    } catch (err: any) {
        console.error('getLiveDashboardStudentsByGameOrSequenceController error', err);
        return res.status(500).json({
            error: 'internal server error',
            db_code: err?.code || null,
            detail: String(err?.message || ''),
        });
    }
}