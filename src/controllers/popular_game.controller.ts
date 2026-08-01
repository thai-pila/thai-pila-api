import { Request, Response } from "express";
import { createPopularGameByGameId, findTopPopularGames } from "../services/popular_game.service";

export async function createPopularGameController(req: Request, res: Response) {
	try {
		const gameId = Number(req.body?.game_id);
		if (!Number.isInteger(gameId) || gameId <= 0) {
			return res.status(400).json({ error: 'invalid game_id' });
		}

		const created = await createPopularGameByGameId(gameId);
		return res.status(201).json(created);
	} catch (err: any) {
		if (err?.code === '23503') {
			return res.status(404).json({ error: 'game_info_id_not_found' });
		}

		console.error('createPopularGameController error', err);
		return res.status(500).json({ error: 'internal server error' });
	}
}

export async function getTopPopularGamesController(req: Request, res: Response) {
	try {
		const limitRaw = req.query?.limit;
		const parsedLimit = Number(limitRaw);
		const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;

		const items = await findTopPopularGames(limit);
		return res.json({
			total: items.length,
			limit: Number.isInteger(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 10,
			items,
		});
	} catch (err: any) {
		console.error('getTopPopularGamesController error', err);
		return res.status(500).json({ error: 'internal server error' });
	}
}