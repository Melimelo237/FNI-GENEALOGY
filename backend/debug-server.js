// backend/debug-server.js - POUR IDENTIFIER L'ERREUR 403
const express = require('express');
require('dotenv').config();

console.log('🔧 Creating Express app...');
const app = express();
const PORT = process.env.PORT || 5000;

// Log chaque middleware ajouté
console.log('🔧 Adding basic middleware...');

// Middleware ultra basique
app.use((req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('📝 Headers:', req.headers);
  next();
});

app.use(express.json());

console.log('🔧 Middleware added successfully');

// Test route ultra simple
app.get('/', (req, res) => {
  console.log('✅ Root route called successfully');
  res.json({
    message: 'Server is working!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
});

app.get('/test', (req, res) => {
  console.log('✅ /test route called successfully');
  res.json({
    message: 'Test route working!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (req, res) => {
  console.log('✅ /api/test route called successfully');
  res.json({
    message: 'API test working!',
    timestamp: new Date().toISOString()
  });
});

// Test avec DB (optionnel)
app.get('/api/health', async (req, res) => {
  console.log('🏥 Health check route called');
  try {
    // Test DB seulement si db.js existe
    const fs = require('fs');
    if (fs.existsSync('./db.js')) {
      const pool = require('./db');
      const result = await pool.query('SELECT NOW(), COUNT(*) FROM naissance');
      console.log('✅ Database connected successfully');
      res.json({
        status: 'OK',
        database: 'Connected',
        timestamp: result.rows[0].now,
        records: result.rows[0].count
      });
    } else {
      console.log('⚠️ db.js not found, skipping database test');
      res.json({
        status: 'OK',
        database: 'Skipped (no db.js)',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('❌ Health check error:', error.message);
    res.status(500).json({
      status: 'ERROR',
      message: error.message
    });
  }
});

// Catch all pour voir ce qui se passe
app.use('*', (req, res) => {
  console.log(`❓ Catch-all route: ${req.method} ${req.originalUrl}`);
  res.json({
    message: 'Catch-all route reached',
    method: req.method,
    url: req.originalUrl,
    available: ['/', '/test', '/api/test', '/api/health']
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('💥 Error handler triggered:', err);
  res.status(500).json({
    error: 'Server error in debug mode',
    message: err.message
  });
});

console.log('🔧 Starting server...');

app.listen(PORT, () => {
  console.log(`\n🚀 DEBUG SERVER STARTED`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`\n🔗 TEST THESE URLs IN YOUR BROWSER:`);
  console.log(`   ✅ http://localhost:${PORT}/`);
  console.log(`   ✅ http://localhost:${PORT}/test`);
  console.log(`   ✅ http://localhost:${PORT}/api/test`);
  console.log(`   ✅ http://localhost:${PORT}/api/health`);
  console.log(`\n👀 Watch the console for logs when you test these URLs\n`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Try:`);
    console.error(`   lsof -ti:${PORT} | xargs kill -9`);
    console.error(`   Or change PORT in .env file`);
  } else {
    console.error('❌ Server error:', err.message);
  }
});

console.log('🔧 Server setup complete');