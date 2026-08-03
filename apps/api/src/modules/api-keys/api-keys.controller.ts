import type { Request, Response, NextFunction } from 'express';

import * as apiKeysService from './api-keys.service';
import { AppError } from '../../errors/app-error';

export async function createApiKeyHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError('Unauthorized', 'UNAUTHORIZED', 401));
      return;
    }

    const { environment } = req.body as { environment?: 'live' | 'test' };
    const result = await apiKeysService.createApiKey(req.user.id, environment ?? 'live');

    res.status(201).json({
      success: true,
      data: result,
      error: null,
      meta: null,
    });
  } catch (err) {
    next(err);
  }
}

export async function listApiKeysHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError('Unauthorized', 'UNAUTHORIZED', 401));
      return;
    }

    const keys = await apiKeysService.listApiKeys(req.user.id);

    res.status(200).json({
      success: true,
      data: keys,
      error: null,
      meta: null,
    });
  } catch (err) {
    next(err);
  }
}

export async function revokeApiKeyHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError('Unauthorized', 'UNAUTHORIZED', 401));
      return;
    }

    const { id } = req.params as { id: string };
    await apiKeysService.revokeApiKey(id, req.user.id);

    res.status(200).json({
      success: true,
      data: null,
      error: null,
      meta: null,
    });
  } catch (err) {
    next(err);
  }
}

export async function rotateApiKeyHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError('Unauthorized', 'UNAUTHORIZED', 401));
      return;
    }

    const { id } = req.params as { id: string };
    const result = await apiKeysService.rotateApiKey(id, req.user.id);

    res.status(200).json({
      success: true,
      data: result,
      error: null,
      meta: null,
    });
  } catch (err) {
    next(err);
  }
}
