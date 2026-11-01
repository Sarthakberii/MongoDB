import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017', {
  serverSelectionTimeoutMS: 2500,
});
let database = null;

export async function connectDatabase() {
  try {
    await client.connect();
    database = client.db(process.env.DB_NAME || 'cinema_buddy');
    await database.collection('bookings').createIndex({ createdAt: -1 });
    await database.collection('movies').createIndex({ id: 1 }, { unique: true });
    console.log('Connected to MongoDB');
  } catch {
    console.warn('MongoDB unavailable. API will use temporary in-memory bookings until MongoDB is started.');
  }
  return database;
}

export const getDatabase = () => database;
