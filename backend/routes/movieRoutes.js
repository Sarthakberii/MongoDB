import { Router } from 'express';
import { getMovies } from '../controllers/movieController.js';

const router = Router();
router.get('/', getMovies);
export default router;
