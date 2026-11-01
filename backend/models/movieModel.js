import { getDatabase } from '../config/database.js';

export const showtimes = ['12:30 PM', '03:45 PM', '06:30 PM', '09:15 PM'];

export const movieCatalog = [
  { id: 'orbit', title: 'Beyond the Orbit', genre: 'SCI-FI · ADVENTURE', rating: '8.7', duration: 128, price: 240, color: '#4f75a8', image: 'https://images.unsplash.com/photo-1446776811953-b23d57b' },
  { id: 'midnight', title: 'Midnight in Kyoto', genre: 'DRAMA · ROMANCE', rating: '8.2', duration: 112, price: 210, color: '#9a5364', image: 'https://images.unsplash.com/photo-1493976040374-85c8e1' },
  { id: 'wild', title: 'The Wild Signal', genre: 'THRILLER · MYSTERY', rating: '7.9', duration: 106, price: 200, color: '#587256', image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d0' },
  { id: 'laugh', title: 'Good Things Happen', genre: 'COMEDY · FEEL-GOOD', rating: '8.4', duration: 98, price: 190, color: '#ad8052', image: 'https://images.unsplash.com/photo-1516307365426-bea591' },
  { id: 'deepblue', title: 'Into the Deep Blue', genre: 'DOCUMENTARY · NATURE', rating: '9.1', duration: 91, price: 180, color: '#417d8b', image: 'https://images.unsplash.com/photo-1518837695005-' },
  { id: 'lastlight', title: 'The Last Lightkeeper', genre: 'DRAMA · MYSTERY', rating: '8.0', duration: 119, price: 220, color: '#986345', image: 'https://images.unsplash.com/photo-1518837695005-2' },
];

export async function seedMovies() {
  const database = getDatabase();
  if (!database) return;
  for (const movie of movieCatalog) {
    await database.collection('movies').updateOne({ id: movie.id }, { $setOnInsert: movie }, { upsert: true });
  }
}

export async function listMovies() {
  const database = getDatabase();
  const rows = database ? await database.collection('movies').find({}).toArray() : movieCatalog;
  return rows.map(({ _id, ...movie }) => movie);
}

export async function findMovie(movieId) {
  const database = getDatabase();
  return database ? database.collection('movies').findOne({ id: movieId }) : movieCatalog.find(movie => movie.id === movieId);
}
