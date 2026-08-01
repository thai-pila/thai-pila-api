import { Request, Response } from "express";
import {
    createRecommendGameByGameId,
    deleteRecommendGameByGameId,
    findAllRecommendGames,
    updateRecommendGameNoByGameId
} from "../services/recommend_game.service";

export async function createRecommendGameByGameIdController(req: Request, res: Response) {
    const { gameId } = req.body;

    const isValidSingleGameId = typeof gameId === 'number' && Number.isInteger(gameId) && gameId > 0;
    const isValidGameIdArray =
        Array.isArray(gameId)
        && gameId.length > 0
        && gameId.every((id) => typeof id === 'number' && Number.isInteger(id) && id > 0);

    if (!isValidSingleGameId && !isValidGameIdArray) {
        return res.status(400).json({ error: 'invalid gameId' });
    }

    try {
        const result = await createRecommendGameByGameId(gameId);
        return res.status(201).json(result);
    } catch (err: any) {
        console.error('create recommend game by game id error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function findAllRecommendGamesController(req: Request, res: Response) {
    try {
        const results = await findAllRecommendGames();
        return res.json(results);
    } catch (err: any) {
        console.error('find all recommend games error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function updateRecommendGameNoByGameIdController(req: Request, res: Response) {
    const { gameId, no } = req.body;
    const numericGameId = Number(gameId);
    const numericNo = Number(no);

    if (!Number.isInteger(numericGameId) || numericGameId <= 0) {
        return res.status(400).json({ error: 'invalid gameId' });
    }

    if (!Number.isInteger(numericNo) || numericNo <= 0) {
        return res.status(400).json({ error: 'invalid no' });
    }

    try {
        const updated = await updateRecommendGameNoByGameId(numericGameId, numericNo);
        if (!updated) {
            return res.status(404).json({ error: 'recommend game not found for this gameId' });
        }

        return res.json(updated);
    } catch (err: any) {
        console.error('update recommend game no by game id error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}

export async function deleteRecommendGameByGameIdController(req: Request, res: Response) {
    const { gameId } = req.params;
    const numericGameId = Number(gameId);

    if (!Number.isInteger(numericGameId) || numericGameId <= 0) {
        return res.status(400).json({ error: 'invalid gameId' });
    }

    try {
        const affectedRows = await deleteRecommendGameByGameId(numericGameId);

        if (affectedRows === 0) {
            return res.status(404).json({ error: 'recommend game not found for this gameId' });
        }

        return res.status(204).send();
    } catch (err: any) {
        console.error('delete recommend game by game id error', err);
        return res.status(500).json({ error: 'internal server error' });
    }
}