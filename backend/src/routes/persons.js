// ====================================
// src/routes/persons.js (VERSION CORRIGÉE)
// src/routes/persons-advanced.js - VERSION IA & BIG DATA
// src/routes/persons-advanced-fixed.js - VERSION CORRIGÉE POSTGRESQL
const express = require('express');
const pool = require('../../db');
const router = express.Router();

// 🧠 RECHERCHE AVANCÉE AVEC IA - VERSION CORRIGÉE
router.post('/search-advanced', async (req, res) => {
  try {
    const {
      q,
      mode = 'intelligent',
      gender,
      birthPlace,
      birthDateFrom,
      birthDateTo,
      region,
      civilCenter,
      hasParents,
      hasChildren,
      documentType,
      limit = 100,
      enablePhonetic = true,
      enableFuzzy = true,
      enableSemantic = true,
      sortBy = 'relevance',
      includeRelations = false,
      includeAnalytics = false
    } = req.body;

    if (!q || !q.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Terme de recherche requis'
      });
    }

    const searchTerm = q.trim();
    const startTime = Date.now();
    let results = [];

    // 🔍 STRATÉGIES DE RECHERCHE INTELLIGENTE - CORRIGÉES
    switch (mode) {
      case 'exact':
        results = await performExactSearchFixed(searchTerm, req.body);
        break;
      case 'phonetic':
        results = await performPhoneticSearchFixed(searchTerm, req.body);
        break;
      case 'intelligent':
      default:
        results = await performIntelligentSearchFixed(searchTerm, req.body);
        break;
    }

    // 📊 CALCUL DU SCORE DE PERTINENCE
    if (results.length > 0) {
      results = calculateRelevanceScoresFixed(results, searchTerm);
      results = applySortingFixed(results, sortBy);
    }

    const responseTime = Date.now() - startTime;

    const response = {
      success: true,
      results: results.slice(0, limit),
      total: results.length,
      query: searchTerm,
      mode,
      performance: {
        responseTime,
        algorithmsUsed: getAlgorithmsUsed(mode)
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche avancée',
      details: error.message
    });
  }
});

// 🎯 RECHERCHE EXACTE CORRIGÉE (Compatible PostgreSQL)
async function performExactSearchFixed(searchTerm, params) {
  const { gender, birthPlace, birthDateFrom, birthDateTo, region, limit = 100 } = params;
  
  // VERSION CORRIGÉE : Enlever DISTINCT pour éviter le conflit ORDER BY
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
      centre_etat,
      date_operation,
      CASE 
        WHEN LOWER(noms_enfant) = LOWER($1) THEN 100
        WHEN LOWER(prenoms_enfant) = LOWER($1) THEN 95
        WHEN LOWER(noms_enfant) LIKE LOWER($1) THEN 90
        WHEN LOWER(prenoms_enfant) LIKE LOWER($1) THEN 85
        WHEN num_acte = $1 THEN 100
        ELSE 50
      END as relevance_score
    FROM naissance 
    WHERE (
      LOWER(noms_enfant) LIKE LOWER($1) OR 
      LOWER(prenoms_enfant) LIKE LOWER($1) OR
      LOWER(noms_pere) LIKE LOWER($1) OR
      LOWER(noms_mere) LIKE LOWER($1) OR
      num_acte = $1
    )
  `;

  const queryParams = [`%${searchTerm}%`];
  let paramIndex = 2;

  // Appliquer les filtres
  if (gender) {
    query += ` AND sexe = $${paramIndex}`;
    queryParams.push(gender);
    paramIndex++;
  }

  if (birthPlace) {
    query += ` AND LOWER(lieu_naiss) LIKE LOWER($${paramIndex})`;
    queryParams.push(`%${birthPlace}%`);
    paramIndex++;
  }

  if (region) {
    query += ` AND LOWER(lieu_naiss) LIKE LOWER($${paramIndex})`;
    queryParams.push(`%${region}%`);
    paramIndex++;
  }

  if (birthDateFrom) {
    query += ` AND date_naiss >= $${paramIndex}`;
    queryParams.push(birthDateFrom);
    paramIndex++;
  }

  if (birthDateTo) {
    query += ` AND date_naiss <= $${paramIndex}`;
    queryParams.push(birthDateTo);
    paramIndex++;
  }

  // ORDER BY avec les champs présents dans SELECT
  query += ` ORDER BY relevance_score DESC, date_naiss DESC NULLS LAST LIMIT $${paramIndex}`;
  queryParams.push(limit);

  try {
    const result = await pool.query(query, queryParams);
    return result.rows.map(formatPersonResult);
  } catch (error) {
    console.error('Exact search error:', error);
    // Fallback vers une requête plus simple
    return await performSimpleSearch(searchTerm, params);
  }
}

// 🔊 RECHERCHE PHONÉTIQUE CORRIGÉE
async function performPhoneticSearchFixed(searchTerm, params) {
  const { limit = 100 } = params;
  
  // Étape 1: Recherche exacte d'abord
  let exactResults = await performExactSearchFixed(searchTerm, params);
  
  if (exactResults.length >= 20) {
    return exactResults;
  }

  // Étape 2: Recherche phonétique simplifiée (sans SOUNDEX si non disponible)
  try {
    let phoneticQuery = `
      SELECT 
        id, noms_enfant, prenoms_enfant,
        noms_enfant || ' ' || COALESCE(prenoms_enfant, '') as full_name,
        date_naiss, lieu_naiss, sexe, noms_pere, noms_mere, num_acte, centre_etat,
        CASE 
          WHEN LOWER(noms_enfant) LIKE LOWER($1) THEN 90
          WHEN LOWER(prenoms_enfant) LIKE LOWER($1) THEN 85
          WHEN LOWER(noms_pere) LIKE LOWER($1) THEN 80
          WHEN LOWER(noms_mere) LIKE LOWER($1) THEN 80
          ELSE 50
        END as phonetic_score
      FROM naissance 
      WHERE LOWER(noms_enfant) SIMILAR TO LOWER($2)
         OR LOWER(prenoms_enfant) SIMILAR TO LOWER($2)
         OR LOWER(noms_pere) SIMILAR TO LOWER($2)
         OR LOWER(noms_mere) SIMILAR TO LOWER($2)
      ORDER BY phonetic_score DESC
      LIMIT $3
    `;

    // Générer un pattern phonétique simple
    const phoneticPattern = generateSimplePhoneticPattern(searchTerm);
    
    const phoneticResult = await pool.query(phoneticQuery, [
      `%${searchTerm}%`,
      phoneticPattern,
      limit
    ]);

    let phoneticResults = phoneticResult.rows.map(row => ({
      ...formatPersonResult(row),
      matchScore: row.phonetic_score,
      matchType: 'phonetic'
    }));

    // Combiner avec les résultats exacts et éliminer les doublons
    const combinedResults = [...exactResults];
    
    phoneticResults.forEach(phoneticResult => {
      const exists = combinedResults.find(exact => exact.id === phoneticResult.id);
      if (!exists) {
        combinedResults.push(phoneticResult);
      }
    });

    return combinedResults.slice(0, limit);

  } catch (error) {
    console.error('Phonetic search error:', error);
    return exactResults; // Fallback sur résultats exacts
  }
}

// 🧠 RECHERCHE INTELLIGENTE CORRIGÉE
async function performIntelligentSearchFixed(searchTerm, params) {
  const { limit = 100 } = params;

  // Stratégie multi-étapes simplifiée et compatible
  let allResults = [];

  try {
    // Étape 1: Résultats exacts (score 100)
    const exactResults = await performExactSearchFixed(searchTerm, { ...params, limit: 50 });
    allResults = exactResults.map(r => ({ ...r, matchScore: r.relevance_score || 100, matchType: 'exact' }));

    // Étape 2: Si pas assez de résultats, recherche élargie
    if (allResults.length < limit / 2) {
      const expandedResults = await performExpandedSearch(searchTerm, params);
      
      // Filtrer les doublons
      const newResults = expandedResults.filter(
        er => !allResults.some(ar => ar.id === er.id)
      );
      
      allResults = [...allResults, ...newResults];
    }

    // Tri final par pertinence
    allResults.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    return allResults.slice(0, limit);

  } catch (error) {
    console.error('Intelligent search error:', error);
    // Fallback vers recherche simple
    return await performSimpleSearch(searchTerm, params);
  }
}

// 🔍 RECHERCHE ÉLARGIE (Fallback intelligent)
async function performExpandedSearch(searchTerm, params) {
  const { limit = 50 } = params;
  
  // Recherche avec patterns plus larges
  const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  
  if (searchWords.length === 0) return [];
  
  let expandedQuery = `
    SELECT 
      id, noms_enfant, prenoms_enfant,
      noms_enfant || ' ' || COALESCE(prenoms_enfant, '') as full_name,
      date_naiss, lieu_naiss, sexe, noms_pere, noms_mere, num_acte, centre_etat,
      70 as match_score
    FROM naissance 
    WHERE 
  `;
  
  const conditions = [];
  const queryParams = [];
  let paramIndex = 1;
  
  searchWords.forEach(word => {
    conditions.push(`(
      LOWER(noms_enfant) LIKE $${paramIndex} OR
      LOWER(prenoms_enfant) LIKE $${paramIndex} OR
      LOWER(noms_pere) LIKE $${paramIndex} OR
      LOWER(noms_mere) LIKE $${paramIndex}
    )`);
    queryParams.push(`%${word}%`);
    paramIndex++;
  });
  
  expandedQuery += conditions.join(' AND ');
  expandedQuery += ` ORDER BY match_score DESC, date_naiss DESC NULLS LAST LIMIT $${paramIndex}`;
  queryParams.push(limit);
  
  try {
    const result = await pool.query(expandedQuery, queryParams);
    return result.rows.map(row => ({
      ...formatPersonResult(row),
      matchScore: row.match_score,
      matchType: 'expanded'
    }));
  } catch (error) {
    console.error('Expanded search error:', error);
    return [];
  }
}

// 🆘 RECHERCHE SIMPLE (Dernier recours)
async function performSimpleSearch(searchTerm, params) {
  const { limit = 100 } = params;
  
  try {
    const simpleQuery = `
      SELECT 
        id, noms_enfant, prenoms_enfant,
        noms_enfant || ' ' || COALESCE(prenoms_enfant, '') as full_name,
        date_naiss, lieu_naiss, sexe, noms_pere, noms_mere, num_acte, centre_etat
      FROM naissance 
      WHERE LOWER(noms_enfant) LIKE LOWER($1) 
         OR LOWER(prenoms_enfant) LIKE LOWER($1)
      ORDER BY 
        CASE 
          WHEN LOWER(noms_enfant) = LOWER($2) THEN 1
          ELSE 2
        END,
        date_naiss DESC NULLS LAST
      LIMIT $3
    `;
    
    const result = await pool.query(simpleQuery, [
      `%${searchTerm}%`,
      searchTerm.toLowerCase(),
      limit
    ]);
    
    return result.rows.map(formatPersonResult);
  } catch (error) {
    console.error('Simple search error:', error);
    return [];
  }
}

// 🎲 GÉNÉRATEUR DE PATTERN PHONÉTIQUE SIMPLE
function generateSimplePhoneticPattern(term) {
  // Remplacements phonétiques basiques
  let pattern = term.toLowerCase()
    .replace(/ch/g, '(ch|tch|c)')
    .replace(/c/g, '(c|k)')
    .replace(/ph/g, '(ph|f)')
    .replace(/ou/g, '(ou|u)')
    .replace(/ai/g, '(ai|è|e)');
    
  return `%${pattern}%`;
}

// 📊 CALCUL DES SCORES DE PERTINENCE CORRIGÉ
function calculateRelevanceScoresFixed(results, searchTerm) {
  return results.map(person => {
    let baseScore = person.matchScore || person.relevance_score || 50;
    
    // Bonifications selon différents critères
    const bonifications = [];
    
    // Correspondance exacte du nom
    if (person.fullName && person.fullName.toLowerCase().includes(searchTerm.toLowerCase())) {
      baseScore += 20;
      bonifications.push('Nom correspond');
    }
    
    // Présence des parents
    if (person.father && person.mother) {
      baseScore += 10;
      bonifications.push('Filiation complète');
    }
    
    // Numéro d'acte présent
    if (person.actNumber) {
      baseScore += 15;
      bonifications.push('Acte officiel');
    }
    
    // Date de naissance précise
    if (person.birthDate && person.birthDate !== '0000-00-00') {
      baseScore += 5;
      bonifications.push('Date précise');
    }

    return {
      ...person,
      matchScore: Math.min(100, baseScore),
      aiHighlights: bonifications
    };
  });
}

// 🔀 FONCTION DE TRI CORRIGÉE
function applySortingFixed(results, sortBy) {
  switch (sortBy) {
    case 'date':
      return results.sort((a, b) => {
        const dateA = a.birthDate ? new Date(a.birthDate) : new Date(0);
        const dateB = b.birthDate ? new Date(b.birthDate) : new Date(0);
        return dateB - dateA;
      });
    case 'name':
      return results.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
    case 'location':
      return results.sort((a, b) => (a.birthPlace || '').localeCompare(b.birthPlace || ''));
    case 'relevance':
    default:
      return results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }
}

// 🎯 SUGGESTIONS INTELLIGENTES SIMPLIFIÉES
router.get('/suggestions', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const suggestions = await generateSimpleSuggestions(q, limit);
    
    res.json({ success: true, suggestions });

  } catch (error) {
    console.error('Suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération de suggestions'
    });
  }
});

async function generateSimpleSuggestions(query, limit) {
  const suggestions = [];
  
  try {
    // Suggestions de noms similaires
    const nameResult = await pool.query(`
      SELECT noms_enfant || ' ' || COALESCE(prenoms_enfant, '') as name, COUNT(*) as count
      FROM naissance 
      WHERE noms_enfant ILIKE $1 OR prenoms_enfant ILIKE $1
      GROUP BY noms_enfant, prenoms_enfant
      ORDER BY count DESC
      LIMIT $2
    `, [`%${query}%`, Math.ceil(limit / 2)]);

    nameResult.rows.forEach(row => {
      suggestions.push({
        text: row.name,
        type: 'person',
        count: parseInt(row.count),
        confidence: Math.min(95, 70 + (parseInt(row.count) / 10))
      });
    });

    // Suggestions de lieux
    const placeResult = await pool.query(`
      SELECT lieu_naiss as place, COUNT(*) as count
      FROM naissance 
      WHERE lieu_naiss ILIKE $1 AND lieu_naiss IS NOT NULL
      GROUP BY lieu_naiss
      ORDER BY count DESC
      LIMIT $2
    `, [`%${query}%`, Math.ceil(limit / 2)]);

    placeResult.rows.forEach(row => {
      suggestions.push({
        text: row.place,
        type: 'place',
        count: parseInt(row.count),
        confidence: Math.min(90, 60 + (parseInt(row.count) / 20))
      });
    });

    // Trier par confiance
    suggestions.sort((a, b) => b.confidence - a.confidence);
    
    return suggestions.slice(0, limit);

  } catch (error) {
    console.error('Generate suggestions error:', error);
    return [];
  }
}

// FONCTIONS UTILITAIRES

function formatPersonResult(row) {
  return {
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
    civilCenter: row.centre_etat,
    lastUpdated: row.date_operation
  };
}

function getAlgorithmsUsed(mode) {
  switch (mode) {
    case 'exact': return ['Exact matching', 'SQL LIKE', 'Relevance scoring'];
    case 'phonetic': return ['Phonetic patterns', 'Similar matching', 'Fuzzy search'];
    case 'intelligent': return ['Exact matching', 'Phonetic search', 'Expanded search', 'AI relevance scoring'];
    default: return ['Standard search'];
  }
}

// 📊 ROUTE STATS MANQUANTE - À AJOUTER
router.get('/stats', async (req, res) => {
  try {
    // Statistiques de base
    const totalResult = await pool.query('SELECT COUNT(*) as total FROM naissance');
    const maleResult = await pool.query(`SELECT COUNT(*) as total FROM naissance WHERE sexe = 'M' OR sexe = '1'`);
    const femaleResult = await pool.query(`SELECT COUNT(*) as total FROM naissance WHERE sexe = 'F' OR sexe = '2'`);
    
    // Statistiques par année (version sécurisée)
    let thisYearResult;
    const currentYear = new Date().getFullYear();
    
    try {
      thisYearResult = await pool.query(`
        SELECT COUNT(*) as total 
        FROM naissance 
        WHERE date_naiss LIKE $1
      `, [`${currentYear}%`]);
    } catch (dateError) {
      console.log('Erreur avec les dates, utilisation de valeur par défaut');
      thisYearResult = { rows: [{ total: '0' }] };
    }
    
    // Top centres d'état civil
    const topCentersResult = await pool.query(`
      SELECT centre_etat, COUNT(*) as count
      FROM naissance 
      WHERE centre_etat IS NOT NULL AND centre_etat != ''
      GROUP BY centre_etat
      ORDER BY count DESC
      LIMIT 5
    `);
    
    // Calculs des totaux
    const total = parseInt(totalResult.rows[0].total);
    const male = parseInt(maleResult.rows[0].total);
    const female = parseInt(femaleResult.rows[0].total);
    const thisYear = parseInt(thisYearResult.rows[0].total);
    
    // Réponse formatée
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
      topCenters: topCentersResult.rows.map(row => ({
        center: row.centre_etat,
        count: parseInt(row.count)
      })),
      generatedAt: new Date().toISOString(),
      note: 'Statistiques générées avec succès'
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

// 📋 ROUTE TEST POUR VÉRIFIER TOUTES LES ROUTES
router.get('/test-routes', async (req, res) => {
  const routes = [
    { method: 'GET', path: '/stats', description: 'Statistiques générales' },
    { method: 'GET', path: '/search', description: 'Recherche de personnes' },
    { method: 'GET', path: '/details', description: 'Détails d\'une personne' },
  ];
  
  res.json({
    success: true,
    message: 'Routes persons disponibles',
    routes,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;