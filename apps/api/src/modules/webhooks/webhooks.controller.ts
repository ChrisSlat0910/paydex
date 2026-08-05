import type { Request, Response, NextFunction } from 'express';

import { ingestWebhook } from './webhooks.service';

export async function ingestWebhookHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const gatewayName = (req.params['gateway'] as string | undefined) ?? '';
    const rawBody = req.body as Buffer;
    const headers = req.headers as Record<string, string | string[] | undefined>;
    const isDuplicate = req.isDuplicate ?? false;
    const externalId = req.externalId ?? '';

    const result = await ingestWebhook(gatewayName, rawBody, headers, isDuplicate, externalId);

    res.status(200).json({
      success: true,
      data: { eventId: result.eventId, duplicate: result.duplicate },
      error: null,
      meta: null,
    });
  } catch (err) {
    next(err);
  }
}
