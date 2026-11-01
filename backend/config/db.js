// CareerConnect — MongoDB connection helper (STEP 2: final version)
// Uses Mongoose. Reads the connection string from process.env.MONGO_URI,
// so local MongoDB and MongoDB Atlas both work with zero code changes.
const dns = require('dns');

dns.setServers(['1.1.1.1', '8.8.8.8']);

const mongoose = require('mongoose');

// Tries to connect up to `retries` times, waiting `delayMs` between attempts.
// This handles the common case where the backend starts a few seconds
// BEFORE MongoDB finishes booting (e.g. both launched at system startup).
const connectDB = async (retries = 5, delayMs = 3000) => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn('⚠️  MONGO_URI is not set in backend/.env — running WITHOUT a database.');
    console.warn('   Database features (auth, jobs, applications) need MongoDB from STEP 3.');
    return null;
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // serverSelectionTimeoutMS: fail each attempt fast (5s) instead of the
      // driver's 30s default, so retries happen quickly and logs stay readable.
      const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`✅ MongoDB connected: ${conn.connection.host} (db: ${conn.connection.name})`);
      return conn;
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt < retries) {
        console.log(`   Retrying in ${delayMs / 1000}s… (is MongoDB running on ${uri}?)`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  console.error('   Giving up for now. The API stays up so /api/health can report the problem,');
  console.error('   but database features will not work until MongoDB is reachable.');
  return null;
};

// Human-readable Mongoose connection state for the /api/health endpoint.
// readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
};

module.exports = { connectDB, getDBStatus };
