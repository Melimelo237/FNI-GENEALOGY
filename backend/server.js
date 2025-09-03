// backend/server.js (VERSION OPTIMALE)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configuration DB
const pool = require('./db');
global.pool = pool;

// Test de connexion à la base
app.get('/api/health', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    const countResult = await client.query('SELECT COUNT(*) FROM naissance');
    client.release();
    
    res.json({
      status: 'OK',
      database: 'Connected',
      timestamp: result.rows[0].now,
      total_records: countResult.rows[0].count
    });
  } catch (err) {
    console.error('Health check error:', err);
    res.status(500).json({
      status: 'ERROR',
      message: err.message
    });
  }
});

// Routes principales
app.use('/api/persons', require('./src/routes/persons'));
app.use('/api/genealogy', require('./src/routes/genealogy'));
app.use('/api/analytics', require('./src/routes/analytics'));
app.use('/api/fraud', require('./src/routes/fraud'));
app.use('/api/chat', require('./src/routes/chat'));

// Route de test
app.get('/api/test', (req, res) => {
  res.json({
    message: 'FNI Genealogy API is running!',
    version: '1.0.0',
    endpoints: [
      'GET /api/health - Health check',
      'GET /api/persons/search - Search persons',
      'GET /api/persons/details?id=X - Person details',
      'GET /api/genealogy/tree?id=X - Family tree',
      'GET /api/analytics/demographics - Demographics',
      'GET /api/fraud/detect - Fraud detection',
      'POST /api/chat/message - AI Chat'
    ]
  });
});

// Gestion d'erreurs globale
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 FNI Genealogy API running on port ${PORT}`);
  console.log(`📊 Database: ${process.env.DB_NAME} on ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 API docs: http://localhost:${PORT}/api/test`);
});