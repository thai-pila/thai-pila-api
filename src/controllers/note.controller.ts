import { Request, Response } from 'express';
import {
	createNote,
	findAllNotes,
	findNoteById,
	findNotesByGameUuidOrSequenceUuidOrUuidNewgen,
	hardDeleteNoteById,
	softDeleteNoteById,
	updateNoteById,
	findNotesByTeacherUuid
} from '../services/note.service';

function isValidUuid(value: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(value);
}

function parseOptionalPositiveInt(value: unknown): number | undefined {
	if (value === undefined || value === null || value === '') return undefined;
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return NaN as unknown as number;
	}
	return parsed;
}

export async function createNoteController(req: Request, res: Response) {
	try {
		const name = String(req.body?.name ?? '').trim();
		const detail = Object.prototype.hasOwnProperty.call(req.body || {}, 'detail')
			? req.body.detail
			: undefined;

		const id_gameinfo = parseOptionalPositiveInt(req.body?.id_gameinfo);
		const id_sequenceinfo = parseOptionalPositiveInt(req.body?.id_sequenceinfo);
		let teacher_uuid: string | null | undefined = undefined;

		if (Object.prototype.hasOwnProperty.call(req.body || {}, 'teacher_uuid')) {
			if (req.body.teacher_uuid === null || req.body.teacher_uuid === '') {
				teacher_uuid = null;
			} else {
				const normalizedTeacherUuid = String(req.body.teacher_uuid).trim();
				if (!isValidUuid(normalizedTeacherUuid)) {
					return res.status(400).json({ error: 'invalid teacher_uuid' });
				}
				teacher_uuid = normalizedTeacherUuid;
			}
		}

		if (Number.isNaN(id_gameinfo) || Number.isNaN(id_sequenceinfo)) {
			return res.status(400).json({ error: 'id_gameinfo_and_id_sequenceinfo_must_be_positive_integers' });
		}

		const created = await createNote({
			name,
			detail,
			id_gameinfo,
			id_sequenceinfo,
			teacher_uuid,
		});

		return res.status(201).json(created);
	} catch (err: any) {
		if (err?.code === 'NOTE_NAME_REQUIRED') {
			return res.status(400).json({ error: 'name_required' });
		}

		if (err?.code === 'NOTE_INVALID_REFERENCE') {
			return res.status(400).json({ error: 'provide_only_one_of_id_gameinfo_or_id_sequenceinfo' });
		}

		if (err?.code === '23503') {
			const detail = String(err?.detail || '');
			if (detail.includes('teacher_uuid')) {
				return res.status(404).json({ error: 'teacher_uuid_not_found' });
			}
			if (detail.includes('id_sequenceinfo')) {
				return res.status(404).json({ error: 'sequence_info_id_not_found' });
			}
			return res.status(404).json({ error: 'game_info_id_not_found' });
		}

		console.error('createNoteController error', err);
		return res.status(500).json({ error: 'internal server error' });
	}
}

export async function updateNoteController(req: Request, res: Response) {
	try {
		const id = Number(req.params.id);
		if (!Number.isInteger(id) || id <= 0) {
			return res.status(400).json({ error: 'invalid id' });
		}

		const raw = req.body || {};
		const payload: any = {};

		if (Object.prototype.hasOwnProperty.call(raw, 'name')) {
			payload.name = raw.name;
		}

		if (Object.prototype.hasOwnProperty.call(raw, 'detail')) {
			payload.detail = raw.detail;
		}

		if (Object.prototype.hasOwnProperty.call(raw, 'id_gameinfo')) {
			const parsed = parseOptionalPositiveInt(raw.id_gameinfo);
			if (Number.isNaN(parsed)) {
				return res.status(400).json({ error: 'id_gameinfo_must_be_positive_integer_or_null' });
			}
			payload.id_gameinfo = parsed ?? null;
		}

		if (Object.prototype.hasOwnProperty.call(raw, 'id_sequenceinfo')) {
			const parsed = parseOptionalPositiveInt(raw.id_sequenceinfo);
			if (Number.isNaN(parsed)) {
				return res.status(400).json({ error: 'id_sequenceinfo_must_be_positive_integer_or_null' });
			}
			payload.id_sequenceinfo = parsed ?? null;
		}

		if (Object.prototype.hasOwnProperty.call(raw, 'teacher_uuid')) {
			if (raw.teacher_uuid === null || raw.teacher_uuid === '') {
				payload.teacher_uuid = null;
			} else {
				const normalizedTeacherUuid = String(raw.teacher_uuid).trim();
				if (!isValidUuid(normalizedTeacherUuid)) {
					return res.status(400).json({ error: 'invalid teacher_uuid' });
				}
				payload.teacher_uuid = normalizedTeacherUuid;
			}
		}

		const updated = await updateNoteById(id, payload);
		if (!updated) {
			return res.status(404).json({ error: 'not found' });
		}

		return res.json(updated);
	} catch (err: any) {
		if (err?.code === 'NOTE_NO_UPDATES') {
			return res.status(400).json({ error: 'no_updatable_fields_provided' });
		}

		if (err?.code === 'NOTE_NAME_REQUIRED') {
			return res.status(400).json({ error: 'name_required' });
		}

		if (err?.code === 'NOTE_INVALID_REFERENCE') {
			return res.status(400).json({ error: 'provide_only_one_of_id_gameinfo_or_id_sequenceinfo' });
		}

		if (err?.code === '23503') {
			const detail = String(err?.detail || '');
			if (detail.includes('teacher_uuid')) {
				return res.status(404).json({ error: 'teacher_uuid_not_found' });
			}
			if (detail.includes('id_sequenceinfo')) {
				return res.status(404).json({ error: 'sequence_info_id_not_found' });
			}
			return res.status(404).json({ error: 'game_info_id_not_found' });
		}

		console.error('updateNoteController error', err);
		return res.status(500).json({ error: 'internal server error' });
	}
}

export async function findAllNotesController(req: Request, res: Response) {
	try {
		const notes = await findAllNotes();
		return res.json(notes);
	} catch (err: any) {
		console.error('findAllNotesController error', err);
		return res.status(500).json({ error: 'internal server error' });
	}
}

export async function findNoteByIdController(req: Request, res: Response) {
	try {
		const id = Number(req.params.id);
		if (!Number.isInteger(id) || id <= 0) {
			return res.status(400).json({ error: 'invalid id' });
		}

		const note = await findNoteById(id);
		if (!note) {
			return res.status(404).json({ error: 'not found' });
		}

		return res.json(note);
	} catch (err: any) {
		console.error('findNoteByIdController error', err);
		return res.status(500).json({ error: 'internal server error' });
	}
}

export async function findNotesByUuidController(req: Request, res: Response) {
	try {
		const uuid = String(req.params.uuid || '').trim();
		if (!uuid) {
			return res.status(400).json({ error: 'uuid_required' });
		}

		if (!isValidUuid(uuid)) {
			return res.status(400).json({ error: 'invalid uuid' });
		}

		const data = await findNotesByGameUuidOrSequenceUuidOrUuidNewgen(uuid);
		if (!data) {
			return res.status(404).json({ error: 'not found' });
		}

		return res.json(data);
	} catch (err: any) {
		if (err?.code === 'NOTE_UUID_REQUIRED') {
			return res.status(400).json({ error: 'uuid_required' });
		}

		console.error('findNotesByUuidController error', err);
		return res.status(500).json({ error: 'internal server error' });
	}
}

export  async function findNotesByTeacherUuidController(req: Request, res: Response) {
	try {
		const teacherUuid = String(req.params.teacher_uuid || '').trim();
		if (!teacherUuid) {
			return res.status(400).json({ error: 'teacher_uuid_required' });
		}

		if (!isValidUuid(teacherUuid)) {
			return res.status(400).json({ error: 'invalid teacher_uuid' });
		}

		const data = await findNotesByTeacherUuid(teacherUuid);
		if (!data) {
			return res.status(404).json({ error: 'not found' });
		}

		return res.json({ notes: data });
	} catch (err: any) {
		if (err?.code === 'NOTE_TEACHER_UUID_REQUIRED') {
			return res.status(400).json({ error: 'teacher_uuid_required' });
		}

		console.error('findNotesByTeacherUuidController error', err);
		return res.status(500).json({ error: 'internal server error' });
	}
}

export async function softDeleteNoteController(req: Request, res: Response) {
	try {
		const id = Number(req.params.id);
		if (!Number.isInteger(id) || id <= 0) {
			return res.status(400).json({ error: 'invalid id' });
		}

		const updated = await softDeleteNoteById(id);
		if (!updated) {
			return res.status(404).json({ error: 'not found' });
		}

		return res.json(updated);
	} catch (err: any) {
		console.error('softDeleteNoteController error', err);
		return res.status(500).json({ error: 'internal server error' });
	}
}

export async function hardDeleteNoteController(req: Request, res: Response) {
	try {
		const id = Number(req.params.id);
		if (!Number.isInteger(id) || id <= 0) {
			return res.status(400).json({ error: 'invalid id' });
		}

		const deleted = await hardDeleteNoteById(id);
		if (!deleted) {
			return res.status(404).json({ error: 'not found' });
		}

		return res.json(deleted);
	} catch (err: any) {
		console.error('hardDeleteNoteController error', err);
		return res.status(500).json({ error: 'internal server error' });
	}
}