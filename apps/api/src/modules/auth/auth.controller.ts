import type { Request, Response, NextFunction } from 'express';

import * as authService from './auth.service';

export async function registerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const tokens = await authService.register(email, password);

    res.status(201).json({
      success: true,
      data: tokens,
      error: null,
      meta: null,
    });
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const tokens = await authService.login(email, password);

    res.status(200).json({
      success: true,
      data: tokens,
      error: null,
      meta: null,
    });
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    const tokens = await authService.refresh(refreshToken);

    res.status(200).json({
      success: true,
      data: tokens,
      error: null,
      meta: null,
    });
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    await authService.logout(refreshToken);

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
