import { Router } from 'express';
import { supportMessage, textCompletion } from '../Controllers/supportController';

const router = Router();

router.post('/getSupport', supportMessage);

router.post('/textCompletion', textCompletion);


export default router;