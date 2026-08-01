import { Request, Response } from "express";
import {
    createCategory,
    findCategoryById,
    findAllCategories,
    findCategoryByTeacherUUID,
    updateCategoryById,
    hardDeleteCategoryById,
    softDeleteCategoryById
} from '../services/category.service';

const UUID_V4_OR_V1_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createCategoryController(req: Request, res: Response) {
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

        const category = await createCategory({
            name: name.trim(),
            teacher_uuid: teacher_uuid ?? null,
            isadmin: isadmin ?? false
        });
        return res.status(201).json(category);
    } catch (err) {
        console.error('create category error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findCategoryByIdController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) return res.status(400).json({ error: 'invalid id' });
        const category = await findCategoryById(id);
        if (!category) return res.status(404).json({ error: 'not found' });
        return res.json(category);
    }
    catch (err) {
        console.error('get category error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findAllCategoriesController(req: Request, res: Response) {
    try {
        const categories = await findAllCategories();
        return res.json(categories);
    }
    catch (err) {
        console.error('get categories error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findCategoryByTeacherUUIDController(req: Request, res: Response) {
    try {
        const teacher_uuid = String(req.params.teacher_uuid || '').trim();
        if (!teacher_uuid || !UUID_V4_OR_V1_REGEX.test(teacher_uuid)) {
            return res.status(400).json({ error: 'invalid teacher_uuid' });
        }

        const categories = await findCategoryByTeacherUUID(teacher_uuid);
        return res.json(categories);
    }
    catch (err) {
        console.error('get categories by teacher_uuid error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function updateCategoryByIdController(req: Request, res: Response) {
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

        const updated = await updateCategoryById(id, payload);
        return res.json(updated);
    } catch (err: any) {
        console.error('update category error', err);
        if (err?.message === 'category not found') {
            return res.status(404).json({ error: 'not found' });
        }
        if (err?.message) {
            return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function hardDeleteCategoryByIdController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'invalid id' });
        }

        const result = await hardDeleteCategoryById(id);
        return res.json({ id_category: id, ...result });
    } catch (err: any) {
        console.error('hard delete category error', err);
        if (err?.message === 'category not found') {
            return res.status(404).json({ error: 'not found' });
        }
        if (err?.message) {
            return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function softDeleteCategoryByIdController(req: Request, res: Response) {
    try {
        const id = Number(req.params.id);
        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ error: 'invalid id' });
        }

        const updated = await softDeleteCategoryById(id);
        if (!updated) return res.status(404).json({ error: 'not found' });

        return res.json(updated);
    } catch (err: any) {
        console.error('soft delete category error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}