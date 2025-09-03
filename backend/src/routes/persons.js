// ====================================
// src/routes/persons.js (VERSION CORRIGÉE)
const express = require('express');
const pool = require('../../db');
const router = express.Router();

// Recherche avancée de personnes
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 50, birthPlace, gender, birthDateFrom, birthDateTo } = req.query;
    
    let query = `
      SELECT 
        id,
        noms_enfant,
        prenoms_enfant,
        noms_enfant || ' ' || COALESCE(prenoms_enfant, '') as full_name,
        date_naiss,
        lieu_naiss,
        sexe,
        noms_pere,
        noms_mere,
        num_acte,
        centre_etat
      FROM naissance 
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // Recherche textuelle
    if (q && q.trim()) {
      query += ` AND (
        LOWER(noms_enfant) LIKE LOWER($${paramIndex}) OR 
        LOWER(prenoms_enfant) LIKE LOWER($${paramIndex}) OR
        LOWER(noms_pere) LIKE LOWER($${paramIndex}) OR
        LOWER(noms_mere) LIKE LOWER($${paramIndex})
      )`;
      params.push(`%${q.trim()}%`);
      paramIndex++;
    }
    
    // Filtre par lieu de naissance
    if (birthPlace && birthPlace.trim()) {
      query += ` AND LOWER(lieu_naiss) LIKE LOWER($${paramIndex})`;
      params.push(`%${birthPlace.trim()}%`);
      paramIndex++;
    }
    
    // Filtre par sexe
    if (gender && ['M', 'F'].includes(gender)) {
      query += ` AND sexe = $${paramIndex}`;
      params.push(gender);
      paramIndex++;
    }
    
    // Filtre par date de naissance (CORRIGÉ)
    if (birthDateFrom) {
      // Vérification si c'est une date valide avant la conversion
      query += ` AND date_naiss IS NOT NULL AND date_naiss::DATE >= $${paramIndex}::DATE`;
      params.push(birthDateFrom);
      paramIndex++;
    }
    
    if (birthDateTo) {
      query += ` AND date_naiss IS NOT NULL AND date_naiss::DATE <= $${paramIndex}::DATE`;
      params.push(birthDateTo);
      paramIndex++;
    }
    
    query += ` ORDER BY 
      CASE 
        WHEN date_naiss ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' 
        THEN date_naiss::DATE 
        ELSE NULL 
      END DESC NULLS LAST 
      LIMIT $${paramIndex}`;
    params.push(parseInt(limit));
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      total: result.rows.length,
      query: q || 'all',
      filters: { birthPlace, gender, birthDateFrom, birthDateTo },
      results: result.rows.map(row => ({
        id: row.id,
        fullName: row.full_name,
        firstName: row.prenoms_enfant,
        lastName: row.noms_enfant,
        birthDate: row.date_naiss,
        birthPlace: row.lieu_naiss,
        gender: row.sexe,
        father: row.noms_pere,
        mother: row.noms_mere,
        actNumber: row.num_acte,
        civilCenter: row.centre_etat
      }))
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la recherche',
      details: error.message 
    });
  }
});

// Détails d'une personne
router.get('/details', async (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID requis en paramètre ?id=123'
      });
    }
    
    const result = await pool.query(`
      SELECT 
        id,
        noms_enfant,
        prenoms_enfant,
        noms_enfant || ' ' || COALESCE(prenoms_enfant, '') as full_name,
        date_naiss,
        lieu_naiss,
        sexe,
        noms_pere,
        noms_mere,
        num_acte,
        centre_etat,
        profession_pere,
        profession_mere,
        domicile_mere,
        domicile_pere,
        nationalite_pere,
        nationalite_mere,
        date_operation,
        declarant,
        qualite
      FROM naissance 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'Personne non trouvée' 
      });
    }
    
    const person = result.rows[0];
    
    res.json({
      success: true,
      person: {
        id: person.id,
        fullName: person.full_name,
        firstName: person.prenoms_enfant,
        lastName: person.noms_enfant,
        birthDate: person.date_naiss,
        birthPlace: person.lieu_naiss,
        gender: person.sexe,
        father: person.noms_pere,
        mother: person.noms_mere,
        actNumber: person.num_acte,
        civilCenter: person.centre_etat,
        fatherProfession: person.profession_pere,
        motherProfession: person.profession_mere,
        motherAddress: person.domicile_mere,
        fatherAddress: person.domicile_pere,
        fatherNationality: person.nationalite_pere,
        motherNationality: person.nationalite_mere,
        registrationDate: person.date_operation,
        declarant: person.declarant,
        declarantQuality: person.qualite
      }
    });
    
  } catch (error) {
    console.error('Get person error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la récupération',
      details: error.message 
    });
  }
});

// 🔧 STATISTIQUES CORRIGÉES - Version robuste
router.get('/stats', async (req, res) => {
  try {
    // Statistiques de base (toujours fonctionnelles)
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM naissance');
    const maleResult = await pool.query(`SELECT COUNT(*) as total FROM naissance WHERE sexe = 'M'`);
    const femaleResult = await pool.query(`SELECT COUNT(*) as total FROM naissance WHERE sexe = 'F'`);
    
    const currentYear = new Date().getFullYear();
    
    // Version CORRIGÉE pour les statistiques par année
    let thisYearResult;
    try {
      // Tentative avec conversion de date sécurisée
      thisYearResult = await pool.query(`
        SELECT COUNT(*) as total 
        FROM naissance 
        WHERE date_naiss IS NOT NULL 
        AND date_naiss ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        AND EXTRACT(YEAR FROM date_naiss::DATE) = $1
      `, [currentYear]);
    } catch (dateError) {
      console.log('Erreur avec extraction de date, utilisation d\'une méthode alternative');
      // Méthode alternative si la conversion échoue
      thisYearResult = await pool.query(`
        SELECT COUNT(*) as total 
        FROM naissance 
        WHERE date_naiss LIKE $1
      `, [`${currentYear}-%`]);
    }
    
    // Statistiques par années (version sécurisée)
    let yearlyStats = [];
    try {
      const yearlyResult = await pool.query(`
        SELECT 
          EXTRACT(YEAR FROM date_naiss::DATE) as year,
          COUNT(*) as count
        FROM naissance 
        WHERE date_naiss IS NOT NULL 
        AND date_naiss ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        GROUP BY EXTRACT(YEAR FROM date_naiss::DATE)
        ORDER BY year DESC
        LIMIT 10
      `);
      yearlyStats = yearlyResult.rows;
    } catch (yearError) {
      console.log('Erreur dans les stats annuelles, données par défaut utilisées');
      yearlyStats = [];
    }
    
    // Top centres (toujours fonctionnel)
    const topCentersResult = await pool.query(`
      SELECT centre_etat, COUNT(*) as count
      FROM naissance 
      WHERE centre_etat IS NOT NULL
      GROUP BY centre_etat
      ORDER BY count DESC
      LIMIT 5
    `);
    
    // Calculs des totaux
    const total = parseInt(totalResult.rows[0].total);
    const male = parseInt(maleResult.rows[0].total);
    const female = parseInt(femaleResult.rows[0].total);
    const thisYear = parseInt(thisYearResult.rows[0].total);
    
    res.json({
      success: true,
      stats: {
        total,
        male,
        female,
        thisYear,
        malePercentage: total > 0 ? ((male / total) * 100).toFixed(1) : '0',
        femalePercentage: total > 0 ? ((female / total) * 100).toFixed(1) : '0',
        thisYearPercentage: total > 0 ? ((thisYear / total) * 100).toFixed(1) : '0'
      },
      yearlyStats,
      topCenters: topCentersResult.rows,
      generatedAt: new Date().toISOString(),
      dataQuality: {
        hasValidDates: yearlyStats.length > 0,
        totalRecords: total,
        note: yearlyStats.length === 0 ? 
          'Certaines statistiques de dates ne sont pas disponibles en raison du format des données' : 
          'Toutes les statistiques sont disponibles'
      }
    });
    
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors du calcul des statistiques',
      details: error.message 
    });
  }
});

// 🆕 NOUVEL ENDPOINT: Vérification de la qualité des données
router.get('/data-quality', async (req, res) => {
  try {
    const checks = await Promise.all([
      // Vérifier le format des dates
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN date_naiss ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN 1 END) as valid_iso_dates,
          COUNT(CASE WHEN date_naiss ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}$' THEN 1 END) as valid_fr_dates,
          COUNT(CASE WHEN date_naiss IS NULL OR date_naiss = '' THEN 1 END) as null_dates
        FROM naissance
      `),
      
      // Vérifier les données manquantes
      pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN noms_enfant IS NULL OR noms_enfant = '' THEN 1 END) as missing_names,
          COUNT(CASE WHEN sexe IS NULL OR sexe = '' THEN 1 END) as missing_gender,
          COUNT(CASE WHEN lieu_naiss IS NULL OR lieu_naiss = '' THEN 1 END) as missing_birthplace
        FROM naissance
      `)
    ]);
    
    const dateQuality = checks[0].rows[0];
    const dataCompleteness = checks[1].rows[0];
    
    res.json({
      success: true,
      dataQuality: {
        dates: {
          total: parseInt(dateQuality.total),
          validISOFormat: parseInt(dateQuality.valid_iso_dates),
          validFRFormat: parseInt(dateQuality.valid_fr_dates),
          nullOrEmpty: parseInt(dateQuality.null_dates),
          validPercentage: ((parseInt(dateQuality.valid_iso_dates) + parseInt(dateQuality.valid_fr_dates)) / parseInt(dateQuality.total) * 100).toFixed(1)
        },
        completeness: {
          total: parseInt(dataCompleteness.total),
          missingNames: parseInt(dataCompleteness.missing_names),
          missingGender: parseInt(dataCompleteness.missing_gender),
          missingBirthplace: parseInt(dataCompleteness.missing_birthplace)
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la vérification de qualité',
      details: error.message 
    });
  }
});

module.exports = router;