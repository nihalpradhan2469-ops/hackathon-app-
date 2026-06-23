import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME && process.env.DB_NAME !== 'your_database_name'
  ? process.env.DB_NAME
  : 'hackradar';

let client;
let clientPromise;

if (uri) {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, { maxPoolSize: 10 });
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
}

export async function getDb() {
  if (!uri) {
    throw new Error('MONGO_URL environment variable is not defined.');
  }
  const c = await clientPromise;
  return c.db(dbName);
}

export async function getCollections() {
  if (!uri) {
    return {
      db: null,
      hackathons: {
        countDocuments: async () => 0,
        find: () => ({
          toArray: async () => [],
          sort: () => ({
            limit: () => ({
              toArray: async () => []
            })
          })
        }),
        findOne: async () => null,
        insertOne: async () => {},
        insertMany: async () => {},
        deleteOne: async () => {},
        updateOne: async () => {},
      },
      saved: {
        find: () => ({ toArray: async () => [] }),
        deleteOne: async () => {},
        insertOne: async () => {},
      },
      scrapeRuns: {
        insertOne: async () => {},
      }
    };
  }
  const db = await getDb();
  return {
    db,
    hackathons: db.collection('hackathons'),
    saved: db.collection('saved'),
    scrapeRuns: db.collection('scrape_runs'),
  };
}

