import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { connectDatabase } from './config/database.js';
import { seedMovies } from './models/movieModel.js';
import bookingRoutes from './routes/bookingRoutes.js';
import demandRoutes from './routes/demandRoutes.js';
import movieRoutes from './routes/movieRoutes.js';

const app = express();
const port = Number(process.env.PORT || 4000);

app.use(cors());
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/movies', movieRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/demand', demandRoutes);

await connectDatabase();
await seedMovies();
app.listen(port, '0.0.0.0', () => console.log(`Cinema Buddy API running at http://localhost:${port}`));
