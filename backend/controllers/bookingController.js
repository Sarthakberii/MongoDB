import { findMovie } from '../models/movieModel.js';
import { listBookings, removeBooking, saveBooking } from '../models/bookingModel.js';

export async function getBookings(req, res) {
  res.json({ bookings: await listBookings() });
}

export async function createBooking(req, res) {
  const { movieId, date, time, seats = 1, customer = 'Movie fan' } = req.body || {};
  const movie = await findMovie(movieId);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date || '') && date >= today;
  if (!movie || !validDate || !['12:30 PM', '03:45 PM', '06:30 PM', '09:15 PM'].includes(time) || !Number.isInteger(seats) || seats < 1 || seats > 8) {
    return res.status(400).json({ error: 'Choose a movie, today or a future date, a valid showtime, and 1–8 seats.' });
  }
  const booking = {
    movieId, movieTitle: movie.title, date, time, seats, customer,
    total: seats * movie.price, status: 'confirmed', createdAt: new Date().toISOString(),
    code: Math.random().toString(36).slice(2, 8).toUpperCase(),
  };
  res.status(201).json({ booking: await saveBooking(booking) });
}

export async function cancelBooking(req, res) {
  const removed = await removeBooking(req.params.id);
  if (!removed) return res.status(404).json({ error: 'Booking not found. Refresh your bookings and try again.' });
  res.json({ ok: true });
}
