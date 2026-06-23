import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME && process.env.DB_NAME !== 'your_database_name'
  ? process.env.DB_NAME
  : 'hackradar';

let client;
let clientPromise;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, { maxPoolSize: 10 });
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export async function getDb() {
  const c = await clientPromise;
  return c.db(dbName);
}

export async function getCollections() {
  const db = await getDb();
  return {
    db,
    hackathons: db.collection('hackathons'),
    saved: db.collection('saved'),
    scrapeRuns: db.collection('scrape_runs'),
  };
}
