import { ObjectId } from 'mongodb';
import { getDatabase } from '../config/database.js';

const temporaryBookings = [];

export async function listBookings() {
  const database = getDatabase();
  const bookings = database
    ? await database.collection('bookings').find({}).sort({ createdAt: -1 }).limit(100).toArray()
    : temporaryBookings;
  return bookings.map(booking => ({ ...booking, id: booking._id?.toString() || booking.id, _id: undefined }));
}

export async function saveBooking(booking) {
  const database = getDatabase();
  if (!database) {
    booking.id = booking.code;
    temporaryBookings.unshift(booking);
    return booking;
  }
  const result = await database.collection('bookings').insertOne(booking);
  return { ...booking, id: result.insertedId.toString() };
}

export async function removeBooking(id) {
  const database = getDatabase();
  if (!database) {
    const index = temporaryBookings.findIndex(booking => booking.id === id);
    if (index < 0) return false;
    temporaryBookings.splice(index, 1);
    return true;
  }
  if (!ObjectId.isValid(id)) return false;
  const result = await database.collection('bookings').deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}
