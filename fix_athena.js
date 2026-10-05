const admin = require('firebase-admin');

// Since we are running this in the node environment of the app, we can just use the credentials from .env.local
// Wait, .env.local didn't have the FIREBASE_PRIVATE_KEY. 
// Ah, the environment variables for firebase are set in the shell? Let me check env.
