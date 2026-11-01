import { listMovies, showtimes } from '../models/movieModel.js';

export async function getMovies(req, res) {
  const movies = await listMovies();
  res.json({ movies, showtimes });
}
