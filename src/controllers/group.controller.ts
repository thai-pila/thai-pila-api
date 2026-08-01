import { Request, Response } from "express";
import {
    createGroup,
    findGroupById,
    findAllGroups,
    findGroupByTeacherUUID,
    updateGroupById,
    hardDeleteGroupById,
    softDeleteGroupById
} from '../services/group.service';

const UUID_V4_OR_V1_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createGroupController(req: Request, res: Response) {
    try {
        const { name, teacher_uuid, isadmin } = req.body;
        if (!name || typeof name !== 'string') {
            return res.status(400).json({ error: 'name is required' });
        }

        if (teacher_uuid !== undefined && teacher_uuid !== null) {
            if (typeof teacher_uuid !== 'string' || !UUID_V4_OR_V1_REGEX.test(teacher_uuid)) {
                return res.status(400).json({ error: 'invalid teacher_uuid' });
            }
        }

        const group = await createGroup({
            name,
            teacher_uuid: teacher_uuid ?? null,
            isadmin: isadmin ?? false
        });
        return res.status(201).json(group);
    } catch (err) {
        console.error('create group error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findGroupByIdController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
        const group = await findGroupById(id);
        if (!group) return res.status(404).json({ error: 'not found' });
        return res.json(group);
    }
    catch (err) {
        console.error('get group error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findAllGroupsController(req: Request, res: Response) {
    try {
        const groups = await findAllGroups();
        return res.json(groups);
    }
    catch (err) {
        console.error('get groups error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findGroupByTeacherUUIDController(req: Request, res: Response) {
    try {
        const teacher_uuid = String(req.params.teacher_uuid || '').trim();
        if (!teacher_uuid || !UUID_V4_OR_V1_REGEX.test(teacher_uuid)) {
            return res.status(400).json({ error: 'invalid teacher_uuid' });
        }

        const groups = await findGroupByTeacherUUID(teacher_uuid);
        return res.json(groups);
    }
    catch (err) {
        console.error('get groups by teacher_uuid error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function updateGroupByIdController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'invalid id' });
        }

        const raw = req.body || {};
        const payload: { name?: string; teacher_uuid?: string | null } = {};

        if (Object.prototype.hasOwnProperty.call(raw, 'name')) {
            if (typeof raw.name !== 'string' || raw.name.trim() === '') {
                return res.status(400).json({ error: 'name is required' });
            }
            payload.name = raw.name.trim();
        }

        if (Object.prototype.hasOwnProperty.call(raw, 'teacher_uuid')) {
            if (raw.teacher_uuid !== null) {
                if (typeof raw.teacher_uuid !== 'string' || !UUID_V4_OR_V1_REGEX.test(raw.teacher_uuid)) {
                    return res.status(400).json({ error: 'invalid teacher_uuid' });
                }
                payload.teacher_uuid = raw.teacher_uuid;
            } else {
                payload.teacher_uuid = null;
            }
        }

        if (!Object.keys(payload).length) {
            return res.status(400).json({ error: 'no updatable fields provided' });
        }

        const updated = await updateGroupById(id, payload);
        return res.json(updated);
    } catch (err: any) {
        console.error('update group error', err);
        if (err?.message === 'group not found') {
            return res.status(404).json({ error: 'not found' });
        }
        if (err?.message) {
            return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function hardDeleteGroupByIdController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'invalid id' });
        }

        const result = await hardDeleteGroupById(id);
        return res.json({ id_group: id, ...result });
    } catch (err: any) {
        console.error('hard delete group error', err);
        if (err?.message === 'group not found') {
            return res.status(404).json({ error: 'not found' });
        }
        if (err?.message) {
            return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function softDeleteGroupByIdController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'invalid id' });
        }

        const updated = await softDeleteGroupById(id);
        if (!updated) return res.status(404).json({ error: 'not found' });

        return res.json(updated);
    } catch (err: any) {
        console.error('soft delete group error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}