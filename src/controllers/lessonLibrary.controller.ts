import { Request, Response } from "express";
import {
  findLibraryItemByUuid,
  getCombinedLibrary,
  getCombinedLibraryByTeacherUuid,
  getDefaultGameLibrary,
  getLibraryExceptGameDefault,
} from "../services/lessonLibrary.service";

export async function getLessonLibraryController(_req: Request, res: Response) {
  try {
    const data = await getCombinedLibrary();
    return res.json(data);
  } catch (err) {
    console.error("get lesson library error", err);
    return res.status(500).json({ error: "internal server error" });
  }
}

export async function getLessonLibraryByTeacherUuidController(req: Request, res: Response) {
  try {
    const teacher_uuid = req.params.teacher_uuid;

    if (!teacher_uuid) {
      return res.status(400).json({ error: "teacher_uuid is required" });
    }

    const data = await getCombinedLibraryByTeacherUuid(teacher_uuid);
    return res.json(data);

  } catch (err) {
    console.error("get lesson library error", err);
    return res.status(500).json({ error: "internal server error" });
  }
}

export async function getLessonLibraryByUuidController(req: Request, res: Response) {
  try {
    const uuid = String(req.params.uuid || "").trim();
    if (!uuid) {
      return res.status(400).json({ error: "invalid uuid" });
    }

    const data = await findLibraryItemByUuid(uuid);
    if (!data) {
      return res.status(404).json({ error: "not found" });
    }

    return res.json(data);
  } catch (err) {
    console.error("get lesson library by uuid error", err);
    return res.status(500).json({ error: "internal server error" });
  }
}

export async function getDefaultGameLibraryController(_req: Request, res: Response) {
  try {
    const data = await getDefaultGameLibrary();
    return res.json(data);
  } catch (err) {
    console.error("get default game library error", err);
    return res.status(500).json({ error: "internal server error" });
  }
}

export async function getLibraryExceptGameDefaultController(_req: Request, res: Response) {
  try {
    const data = await getLibraryExceptGameDefault();
    return res.json(data);
  } catch (err) {
    console.error("get library except default game error", err);
    return res.status(500).json({ error: "internal server error" });
  }
}