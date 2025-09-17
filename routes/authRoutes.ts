import { Router } from 'express';
import { signUp, signIn, logout } from '../Controllers/authController';
import { saveUser } from '../Middlewares/userAuth';

const router = Router();

router.post('/signup', saveUser, signUp);

router.post('/signin', signIn);

router.post('/logout', logout)

export default router;