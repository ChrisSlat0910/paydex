import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../../errors/app-error';
import * as gatewaysService from './gateways.service';

export async function createGatewayHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError('Unauthorized', 'UNAUTHORIZED', 401));
      return;
    }

    const { name, adapterType, credentials } = req.body as {
      name: string;
      adapterType: string;
      credentials: string;
    };

    const gateway = await gatewaysService.createGateway(
      req.user.id,
      name,
      adapterType,
      credentials,
    );

    res.status(201).json({ success: true, data: gateway, error: null, meta: null });
  } catch (err) {
    next(err);
  }
}

export async function listGatewaysHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError('Unauthorized', 'UNAUTHORIZED', 401));
      return;
    }

    const isAdmin = req.user.role === 'admin';
    const gateways = await gatewaysService.listGateways(req.user.id, isAdmin);

    res.status(200).json({ success: true, data: gateways, error: null, meta: null });
  } catch (err) {
    next(err);
  }
}

export async function getGatewayHandler(
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
    const isAdmin = req.user.role === 'admin';
    const gateway = await gatewaysService.getGateway(id, req.user.id, isAdmin);

    res.status(200).json({ success: true, data: gateway, error: null, meta: null });
  } catch (err) {
    next(err);
  }
}

export async function updateGatewayHandler(
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
    const updates = req.body as { name?: string; credentials?: string };
    const gateway = await gatewaysService.updateGateway(id, req.user.id, updates);

    res.status(200).json({ success: true, data: gateway, error: null, meta: null });
  } catch (err) {
    next(err);
  }
}

export async function deactivateGatewayHandler(
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
    await gatewaysService.deactivateGateway(id, req.user.id);

    res.status(200).json({ success: true, data: null, error: null, meta: null });
  } catch (err) {
    next(err);
  }
}
