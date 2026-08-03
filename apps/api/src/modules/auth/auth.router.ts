import { Router } from 'express';

import { loginHandler, logoutHandler, refreshHandler, registerHandler } from './auth.controller';

const router = Router();

router.post('/register', (req, res, next) => {
  void registerHandler(req, res, next);
});
router.post('/login', (req, res, next) => {
  void loginHandler(req, res, next);
});
router.post('/refresh', (req, res, next) => {
  void refreshHandler(req, res, next);
});
router.post('/logout', (req, res, next) => {
  void logoutHandler(req, res, next);
});

export { router as authRouter };
