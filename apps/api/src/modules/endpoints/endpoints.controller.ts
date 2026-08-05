import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../../errors/app-error';
import * as endpointsService from './endpoints.service';

export async function createEndpointHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError('Unauthorized', 'UNAUTHORIZED', 401));
      return;
    }

    const { gatewayId, url, secret } = req.body as {
      gatewayId: string;
      url: string;
      secret?: string;
    };

    const endpoint = await endpointsService.createEndpoint(req.user.id, gatewayId, url, secret);

    res.status(201).json({ success: true, data: endpoint, error: null, meta: null });
  } catch (err) {
    next(err);
  }
}

export async function listEndpointsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError('Unauthorized', 'UNAUTHORIZED', 401));
      return;
    }

    const endpoints = await endpointsService.listEndpoints(req.user.id);

    res.status(200).json({ success: true, data: endpoints, error: null, meta: null });
  } catch (err) {
    next(err);
  }
}

export async function deactivateEndpointHandler(
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
    await endpointsService.deactivateEndpoint(id, req.user.id);

    res.status(200).json({ success: true, data: null, error: null, meta: null });
  } catch (err) {
    next(err);
  }
}
