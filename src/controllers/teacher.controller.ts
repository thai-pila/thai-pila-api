import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { createTeacherIfNotExists, findTeacherByUuid, countTeacher, getAllTeacherNameCountCreateGameRanking } from "../services/teacher.service";

type JwtPayload = {
	user?: unknown;
	domain?: unknown;
	iat?: unknown;
};

function isValidUuid(value: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(value);
}

function extractBearerToken(authHeader: string | undefined): string | null {
	const normalized = String(authHeader || "").trim();
	if (!normalized.toLowerCase().startsWith("bearer ")) {
		return null;
	}

	const token = normalized.slice(7).trim();
	return token || null;
}

function decodePayload(token: string): JwtPayload | null {

	// const publicKeyRaw = process.env.JWT_PUBLIC_KEY;
	// if (publicKeyRaw) {
	// 	const publicKey = publicKeyRaw.replace(/\\n/g, "\n");
	// 	try {
	// 		const verified = jwt.verify(token, publicKey, { algorithms: ["RS256"] });
	// 		if (verified && typeof verified === "object") {
	// 			return verified as JwtPayload;
	// 		}
	// 		return null;
	// 	} catch {
	// 		return null;
	// 	}
	// }

	const decoded = jwt.decode(token);
	if (!decoded || typeof decoded !== "object") {
		return null;
	}

	return decoded as JwtPayload;
}

export async function createTeacherIfNotExistsController(req: Request, res: Response) {
	const { uuid, name } = req.body;

	if (!uuid || !name) {
		return res.status(400).json({
			success: false,
			message: "uuid and name are required",
		});
	}

	try {
		const result = await createTeacherIfNotExists(uuid, name);

		if (result.inserted) {
			return res.status(201).json({
				success: true,
				inserted: true,
				teacher: result.teacher,
			});
		}

		return res.status(200).json({
			success: true,
			inserted: false,
			message: "Teacher with this uuid already exists. Do nothing.",
		});
	} catch (error: any) {
		return res.status(500).json({
			success: false,
			message: error.message || "Internal server error",
		});
	}
}

export async function checkTeacherFromJwtController(req: Request, res: Response) {
	const token = extractBearerToken(req.headers.authorization);
	if (!token) {
		return res.status(401).json({
			success: false,
			message: "missing_or_invalid_bearer_token",
		});
	}

	const payload = decodePayload(token);
	if (!payload) {
		return res.status(401).json({
			success: false,
			message: "invalid_jwt_payload",
		});
	}

	const teacherUuid = String(payload.user ?? "").trim();
	if (!teacherUuid || !isValidUuid(teacherUuid)) {
		return res.status(400).json({
			success: false,
			message: "invalid_user_uuid_in_jwt",
		});
	}

	try {
		const existingTeacher = await findTeacherByUuid(teacherUuid);
		if (existingTeacher) {
			return res.status(200).json({
				success: true,
				exists: true,
				teacher: existingTeacher,
			});
		}

		const fallbackName = String(req.body?.name ?? "").trim() || `teacher-${teacherUuid.slice(0, 8)}`;
		const created = await createTeacherIfNotExists(teacherUuid, fallbackName);

		if (created.teacher) {
			return res.status(201).json({
				success: true,
				exists: false,
				inserted: created.inserted,
				teacher: created.teacher,
			});
		}

		const teacherAfterInsert = await findTeacherByUuid(teacherUuid);
		if (!teacherAfterInsert) {
			return res.status(500).json({
				success: false,
				message: "failed_to_resolve_teacher_after_insert",
			});
		}

		return res.status(200).json({
			success: true,
			exists: true,
			teacher: teacherAfterInsert,
		});
	} catch (error: any) {
		return res.status(500).json({
			success: false,
			message: error?.message || "Internal server error",
		});
	}
}

export async function checkUserByJwtController(req: Request, res: Response) {
	const token = extractBearerToken(req.headers.authorization);
	if (!token) {
		return res.status(401).json({
			success: false,
			message: "missing_or_invalid_bearer_token",
		});
	}

	const payload = decodePayload(token);
	if (!payload) {
		return res.status(401).json({
			success: false,
			message: "invalid_jwt_payload",
		});
	}

	const teacherUuid = String(payload.user ?? "").trim();
	if (!teacherUuid || !isValidUuid(teacherUuid)) {
		return res.status(400).json({
			success: false,
			message: "invalid_user_uuid_in_jwt",
		});
	}

	try {
		const existingTeacher = await findTeacherByUuid(teacherUuid);
		if (existingTeacher) {
			return res.status(200).json({
				success: true,
				exists: true,
				teacher: existingTeacher,
			});
		}

		return res.status(200).json({
			success: true,
			exists: false,
			teacher: null,
		});
	} catch (error: any) {
		return res.status(500).json({
			success: false,
			message: error?.message || "Internal server error",
		});
	}
}

export async function createUserByJwtController(req: Request, res: Response) {
	const token = extractBearerToken(req.headers.authorization);
	if (!token) {
		return res.status(401).json({
			success: false,
			message: "missing_or_invalid_bearer_token",
		});
	}

	const payload = decodePayload(token);
	if (!payload) {
		return res.status(401).json({
			success: false,
			message: "invalid_jwt_payload",
		});
	}

	const teacherUuid = String(payload.user ?? "").trim();
	if (!teacherUuid || !isValidUuid(teacherUuid)) {
		return res.status(400).json({
			success: false,
			message: "invalid_user_uuid_in_jwt",
		});
	}

	const name = String(req.body?.name ?? "").trim();
	if (!name) {
		return res.status(400).json({
			success: false,
			message: "name_required",
		});
	}

	try {
		const existingTeacher = await findTeacherByUuid(teacherUuid);
		if (existingTeacher) {
			return res.status(200).json({
				success: true,
				exists: true,
				inserted: false,
				teacher: existingTeacher,
			});
		}

		const created = await createTeacherIfNotExists(teacherUuid, name);
		if (created.teacher) {
			return res.status(201).json({
				success: true,
				exists: false,
				inserted: created.inserted,
				teacher: created.teacher,
			});
		}

		const teacherAfterInsert = await findTeacherByUuid(teacherUuid);
		if (!teacherAfterInsert) {
			return res.status(500).json({
				success: false,
				message: "failed_to_resolve_teacher_after_insert",
			});
		}

		return res.status(200).json({
			success: true,
			exists: true,
			inserted: false,
			teacher: teacherAfterInsert,
		});
	} catch (error: any) {
		return res.status(500).json({
			success: false,
			message: error?.message || "Internal server error",
		});
	}
}

export async function countTeacherController(req: Request, res: Response) {
	try {
		const count = await countTeacher();
		return res.status(200).json({
			count,
		});
	} catch (error: any) {
		return res.status(500).json({
			success: false,
			message: error?.message || "Internal server error",
		});
	}
}

export async function getAllTeacherNameCountCreateGameRankingController(req: Request, res: Response) {
	try {
		const ranking = await getAllTeacherNameCountCreateGameRanking();
		return res.status(200).json(ranking);
	} catch (error: any) {
		return res.status(500).json({
			success: false,
			message: error?.message || "Internal server error",
		});
	}
}