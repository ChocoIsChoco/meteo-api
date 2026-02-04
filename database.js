const { MongoClient } = require('mongodb');
const fs = require('node:fs');

let mongodbUrl;
if (process.env.MONGODB_URI_FILE) {
  mongodbUrl = fs.readFileSync(process.env.MONGODB_URI_FILE, 'utf8').replace(/[^\x20-\x7E]/g, "").trim();
} else {
  mongodbUrl = process.env.MONGODB_URI;
}

const config = {
  url: mongodbUrl,
  database: process.env.DB_NAME
};

let client;
let db;


async function connectToDatabase() {
  try {
    client = new MongoClient(config.url);
    await client.connect();
    db = client.db(config.database);
    console.log('Connecté à MongoDB avec succès');
    return db;
  } catch (error) {
    console.error('Erreur de connexion à MongoDB:', error);
    process.exit(1);
  }
}


function getDatabase() {
  if (!db) {
    throw new Error('Base de données non connectée. Appelez connectToDatabase() d\'abord.');
  }
  return db;
}

async function closeConnection() {
  if (client) {
    await client.close();
    console.log('Connexion MongoDB fermée');
  }
}

module.exports = {
  connectToDatabase,
  getDatabase,
  closeConnection
};