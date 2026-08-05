import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../../errors/app-error';
import * as eventsService from './events.service';

export async function listEventsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError('Unauthorized', 'UNAUTHORIZED', 401));
      return;
    }

    const { status, gatewayId, from, to, cursor, limit } = req.query as Record<
      string,
      string | undefined
    >;

    const result = await eventsService.listEvents({
      ownerId: req.user.id,
      isAdmin: req.user.role === 'admin',
      status,
      gatewayId,
      from,
      to,
      cursor,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    res.status(200).json({
      success: true,
      data: result.events,
      error: null,
      meta: { nextCursor: result.nextCursor, hasMore: result.hasMore },
    });
  } catch (err) {
    next(err);
  }
}

export async function getEventHandler(
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
    const event = await eventsService.getEvent(id, req.user.id, req.user.role === 'admin');

    res.status(200).json({ success: true, data: event, error: null, meta: null });
  } catch (err) {
    next(err);
  }
}

export async function getDeliveryLogsHandler(
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
    const logs = await eventsService.getDeliveryLogs(id, req.user.id, req.user.role === 'admin');

    res.status(200).json({ success: true, data: logs, error: null, meta: null });
  } catch (err) {
    next(err);
  }
}
