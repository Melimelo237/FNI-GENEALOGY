// ===================================
// src/routes/fraud.js - VERSION CORRIGÉE
const express = require('express');
const pool = require('../../db');
const router = express.Router();

// Détection d'anomalies - VERSION CORRIGÉE
router.get('/detect', async (req, res) => {
  try {
    const { category = 'all', limit = 50 } = req.query;
    
    const anomalies = await detectAnomaliesFixed(category, parseInt(limit));
    
    res.json({
      success: true,
      category,
      total: anomalies.length,
      anomalies,
      summary: {
        critical: anomalies.filter(a => a.severity === 'critical').length,
        high: anomalies.filter(a => a.severity === 'high').length,
        medium: anomalies.filter(a => a.severity === 'medium').length,
        low: anomalies.filter(a => a.severity === 'low').length
      },
      lastScan: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Fraud detection error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la détection de fraudes',
      details: error.message 
    });
  }
});

async function detectAnomaliesFixed(category, limit) {
  const anomalies = [];
  
  try {
    // 1. Détection de doublons potentiels
    if (category === 'all' || category === 'duplicates') {
      const duplicates = await detectDuplicatesFixed(Math.ceil(limit / 3));
      anomalies.push(...duplicates);
    }
    
    // 2. Données manquantes
    if (category === 'all' || category === 'data') {
      const dataIssues = await detectDataQualityFixed(Math.ceil(limit / 3));
      anomalies.push(...dataIssues);
    }
    
    // 3. Enregistrements suspects par volume
    if (category === 'all' || category === 'mass') {
      const massReg = await detectMassRegistrationFixed(Math.ceil(limit / 3));
      anomalies.push(...massReg);
    }
    
    return anomalies.sort((a, b) => new Date(b.detectedAt) - new Date(a.detectedAt));
    
  } catch (error) {
    console.error('Anomaly detection error:', error);
    
    // Version de fallback encore plus simple
    return await detectBasicAnomalies(limit);
  }
}

async function detectDuplicatesFixed(limit) {
  const result = await pool.query(`
    SELECT 
      n1.id as id1,
      n2.id as id2,
      n1.noms_enfant || ' ' || COALESCE(n1.prenoms_enfant, '') as name1,
      n1.date_naiss as birth1,
      n2.date_naiss as birth2,
      n1.lieu_naiss as place1,
      n2.lieu_naiss as place2
    FROM naissance n1
    JOIN naissance n2 ON n1.id < n2.id
    WHERE n1.noms_enfant = n2.noms_enfant
      AND COALESCE(n1.prenoms_enfant, '') = COALESCE(n2.prenoms_enfant, '')
      AND n1.noms_enfant IS NOT NULL
      AND n1.noms_enfant != ''
    LIMIT $1
  `, [limit]);
  
  return result.rows.map(row => ({
    id: `DUP_${row.id1}_${row.id2}`,
    type: 'duplicate_identity',
    severity: 'high',
    title: 'Identité potentiellement dupliquée',
    description: `${row.name1} - IDs multiples: ${row.id1}, ${row.id2}`,
    personInvolved: row.name1,
    detectedAt: new Date(),
    confidence: 85,
    details: {
      record1: { id: row.id1, birth: row.birth1, place: row.place1 },
      record2: { id: row.id2, birth: row.birth2, place: row.place2 }
    },
    flags: ['identity_duplication', 'investigate_records']
  }));
}

async function detectDataQualityFixed(limit) {
  const result = await pool.query(`
    SELECT 
      id,
      noms_enfant || ' ' || COALESCE(prenoms_enfant, '') as person_name,
      CASE 
        WHEN noms_pere IS NULL OR noms_pere = '' THEN 'missing_father'
        WHEN noms_mere IS NULL OR noms_mere = '' THEN 'missing_mother'
        ELSE 'other_missing'
      END as missing_type
    FROM naissance 
    WHERE (noms_pere IS NULL OR noms_pere = '') 
       OR (noms_mere IS NULL OR noms_mere = '')
    LIMIT $1
  `, [limit]);
  
  return result.rows.map(row => ({
    id: `DATA_${row.id}`,
    type: 'data_quality',
    severity: 'low',
    title: 'Données parentales manquantes',
    description: `${row.person_name} - ${row.missing_type.replace('_', ' ')}`,
    personInvolved: row.person_name,
    detectedAt: new Date(),
    confidence: 95,
    details: {
      recordId: row.id,
      missingType: row.missing_type
    },
    flags: ['incomplete_data', 'data_entry_issue']
  }));
}

async function detectMassRegistrationFixed(limit) {
  const result = await pool.query(`
    SELECT 
      COALESCE(created_by, 'AGENT_INCONNU') as agent,
      COUNT(*) as count,
      MIN(date_operation) as first_reg,
      MAX(date_operation) as last_reg
    FROM naissance
    WHERE date_operation IS NOT NULL
      AND created_by IS NOT NULL
    GROUP BY created_by
    HAVING COUNT(*) > 100
    ORDER BY count DESC
    LIMIT $1
  `, [limit]);
  
  return result.rows.map(row => ({
    id: `MASS_${row.agent}_${Date.now()}`,
    type: 'mass_registration',
    severity: row.count > 500 ? 'high' : 'medium',
    title: 'Volume d\'enregistrement élevé',
    description: `Agent ${row.agent}: ${row.count} enregistrements au total`,
    personInvolved: `Agent: ${row.agent}`,
    detectedAt: new Date(),
    confidence: 75,
    details: {
      agent: row.agent,
      totalRecords: row.count,
      firstRegistration: row.first_reg,
      lastRegistration: row.last_reg
    },
    flags: ['high_volume', 'verify_authenticity']
  }));
}

async function detectBasicAnomalies(limit) {
  // Version ultra-simple en cas d'échec
  const missingData = await pool.query(`
    SELECT COUNT(*) as count FROM naissance 
    WHERE noms_pere IS NULL OR noms_mere IS NULL
    LIMIT 1
  `);
  
  const duplicateNames = await pool.query(`
    SELECT noms_enfant, COUNT(*) as count
    FROM naissance 
    WHERE noms_enfant IS NOT NULL
    GROUP BY noms_enfant
    HAVING COUNT(*) > 3
    LIMIT 5
  `);
  
  const anomalies = [];
  
  if (parseInt(missingData.rows[0].count) > 0) {
    anomalies.push({
      id: 'BASIC_DATA_QUALITY',
      type: 'data_quality',
      severity: 'low',
      title: 'Qualité des données',
      description: `${missingData.rows[0].count} enregistrements avec données manquantes`,
      confidence: 90,
      detectedAt: new Date(),
      flags: ['data_quality']
    });
  }
  
  duplicateNames.rows.forEach(row => {
    anomalies.push({
      id: `BASIC_DUP_${row.noms_enfant}`,
      type: 'potential_duplicate',
      severity: 'medium',
      title: 'Nom fréquent',
      description: `${row.noms_enfant} apparaît ${row.count} fois`,
      confidence: 60,
      detectedAt: new Date(),
      flags: ['frequent_name']
    });
  });
  
  return anomalies;
}

module.exports = router;