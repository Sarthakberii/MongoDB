import { Router } from 'express';
import { getDemand } from '../controllers/demandController.js';

const router = Router();
router.get('/', getDemand);
export default router;
