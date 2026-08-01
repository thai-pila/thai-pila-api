import { Request, Response } from "express";

export async function uploadMediaController(req: Request, res: Response) {
    try {
        const file = req.file;
        const { sectionName, user_uuid, ref_id } = req.body;

        if (!file) {
            return res.status(400).json({ error: "no_file_provided" });
        }

        const fileUrl = `/upload/${file.filename}`;

        return res.status(200).json({
            url: fileUrl,
            sectionName: sectionName || null,
            user_uuid: user_uuid || null,
            ref_id: ref_id || null
        });

    } catch (err: any) {
        console.error("uploadMediaController error", err);
        return res.status(500).json({ error: "internal_server_error" });
    }
}