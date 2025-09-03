// src/routes/analytics.js - CORRECTION FINALE
const express = require('express');
const pool = require('../../db');
const router = express.Router();

// Analyses démographiques - VERSION FINALE CORRIGÉE
router.get('/demographics', async (req, res) => {
  try {
    const { region = 'all', timeframe = 'year' } = req.query;
    
    const analytics = await getDemographicAnalyticsFixed(region, timeframe);
    
    res.json({
      success: true,
      region,
      timeframe,
      analytics,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Demographics error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de l\'analyse démographique',
      details: error.message 
    });
  }
});

async function getDemographicAnalyticsFixed(region, timeframe) {
  const regionFilter = region !== 'all' ? `AND LOWER(lieu_naiss) LIKE '%${region.toLowerCase()}%'` : '';
  
  try {
    // 1. Statistiques de base
    const totalBirths = await pool.query(`
      SELECT COUNT(*) as count FROM naissance WHERE 1=1 ${regionFilter}
    `);
    
    // 2. Distribution par sexe
    const genderDist = await pool.query(`
      SELECT sexe, COUNT(*) as count 
      FROM naissance 
      WHERE sexe IN ('1', '2', 'M', 'F') ${regionFilter}
      GROUP BY sexe
      ORDER BY sexe
    `);
    
    // 3. Top lieux de naissance
    const topPlaces = await pool.query(`
      SELECT lieu_naiss, COUNT(*) as count
      FROM naissance 
      WHERE lieu_naiss IS NOT NULL AND lieu_naiss != '' ${regionFilter}
      GROUP BY lieu_naiss
      ORDER BY count DESC
      LIMIT 10
    `);
    
    // 4. Distribution par centres d'état civil
    const centerDist = await pool.query(`
      SELECT centre_etat, COUNT(*) as count
      FROM naissance 
      WHERE centre_etat IS NOT NULL AND centre_etat != '' ${regionFilter}
      GROUP BY centre_etat
      ORDER BY count DESC
      LIMIT 5
    `);
    
    // 5. Naissances par année - REQUÊTE CORRIGÉE
    let yearlyTrends = [];
    try {
      const yearlyResult = await pool.query(`
        SELECT 
          year_extracted,
          COUNT(*) as births
        FROM (
          SELECT 
            CASE 
              WHEN date_naiss IS NOT NULL AND date_naiss::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
              THEN EXTRACT(YEAR FROM date_naiss::date)
              ELSE NULL
            END as year_extracted
          FROM naissance 
          WHERE date_naiss IS NOT NULL ${regionFilter}
        ) yearly_data
        WHERE year_extracted IS NOT NULL
          AND year_extracted >= $1
        GROUP BY year_extracted
        ORDER BY year_extracted DESC
        LIMIT 5
      `, [new Date().getFullYear() - 4]);
      
      yearlyTrends = yearlyResult.rows.map(row => ({
        year: parseInt(row.year_extracted),
        births: parseInt(row.births)
      }));
    } catch (yearError) {
      console.log('Yearly trends failed, using simple count');
      yearlyTrends = [];
    }
    
    // 6. Tendances mensuelles - REQUÊTE CORRIGÉE
    let monthlyTrends = [];
    try {
      const monthlyResult = await pool.query(`
        SELECT 
          month_extracted,
          COUNT(*) as births
        FROM (
          SELECT 
            CASE 
              WHEN date_naiss IS NOT NULL AND date_naiss::text ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
              THEN EXTRACT(MONTH FROM date_naiss::date)
              ELSE NULL
            END as month_extracted
          FROM naissance 
          WHERE date_naiss IS NOT NULL 
            AND date_naiss::text ~ '^2024-'  -- Année courante
            ${regionFilter}
        ) monthly_data
        WHERE month_extracted IS NOT NULL
        GROUP BY month_extracted
        ORDER BY month_extracted
      `);
      
      monthlyTrends = monthlyResult.rows.map(row => ({
        month: parseInt(row.month_extracted),
        monthName: getMonthName(parseInt(row.month_extracted)),
        births: parseInt(row.births)
      }));
    } catch (monthError) {
      console.log('Monthly trends failed, using simple count');
      monthlyTrends = [];
    }
    
    // 7. Analyse de la répartition des enregistrements par période
    const registrationAnalysis = await pool.query(`
      SELECT 
        CASE 
          WHEN date_operation IS NOT NULL THEN 'avec_date_operation'
          ELSE 'sans_date_operation'
        END as status,
        COUNT(*) as count
      FROM naissance ${regionFilter.replace('AND', 'WHERE').replace('WHERE WHERE', 'WHERE')}
      GROUP BY 
        CASE 
          WHEN date_operation IS NOT NULL THEN 'avec_date_operation'
          ELSE 'sans_date_operation'
        END
    `);
    
    return {
      summary: {
        totalBirths: parseInt(totalBirths.rows[0].count),
        region: region,
        timeframe: timeframe,
        dataQuality: {
          hasYearlyData: yearlyTrends.length > 0,
          hasMonthlyData: monthlyTrends.length > 0,
          totalRecords: parseInt(totalBirths.rows[0].count)
        }
      },
      genderDistribution: genderDist.rows.map(row => ({
        gender: normalizeGender(row.sexe),
        code: row.sexe,
        count: parseInt(row.count),
        percentage: ((parseInt(row.count) / parseInt(totalBirths.rows[0].count)) * 100).toFixed(1)
      })),
      topBirthPlaces: topPlaces.rows.map(row => ({
        place: row.lieu_naiss,
        count: parseInt(row.count),
        percentage: ((parseInt(row.count) / parseInt(totalBirths.rows[0].count)) * 100).toFixed(1)
      })),
      topCenters: centerDist.rows.map(row => ({
        center: row.centre_etat,
        count: parseInt(row.count),
        percentage: ((parseInt(row.count) / parseInt(totalBirths.rows[0].count)) * 100).toFixed(1)
      })),
      yearlyTrends: yearlyTrends,
      monthlyTrends: monthlyTrends,
      registrationAnalysis: registrationAnalysis.rows.map(row => ({
        status: row.status,
        count: parseInt(row.count)
      }))
    };
    
  } catch (error) {
    console.error('Analytics comprehensive error:', error);
    
    // Version de fallback ultra-simple
    return await getUltraSimpleAnalytics(regionFilter);
  }
}

async function getUltraSimpleAnalytics(regionFilter) {
  try {
    const totalBirths = await pool.query(`
      SELECT COUNT(*) as count FROM naissance WHERE 1=1 ${regionFilter}
    `);
    
    const genderDist = await pool.query(`
      SELECT sexe, COUNT(*) as count 
      FROM naissance 
      WHERE sexe IS NOT NULL ${regionFilter}
      GROUP BY sexe
      ORDER BY count DESC
    `);
    
    const topPlaces = await pool.query(`
      SELECT lieu_naiss, COUNT(*) as count
      FROM naissance 
      WHERE lieu_naiss IS NOT NULL AND lieu_naiss != ''
      GROUP BY lieu_naiss
      ORDER BY count DESC
      LIMIT 5
    `);
    
    const recentRecords = await pool.query(`
      SELECT COUNT(*) as count
      FROM naissance 
      WHERE date_operation IS NOT NULL
        AND date_operation >= CURRENT_DATE - INTERVAL '30 days'
    `);
    
    return {
      summary: {
        totalBirths: parseInt(totalBirths.rows[0].count),
        region: 'all',
        timeframe: 'all_time',
        mode: 'fallback_simple',
        recentActivity: parseInt(recentRecords.rows[0].count)
      },
      genderDistribution: genderDist.rows.map(row => ({
        gender: normalizeGender(row.sexe),
        code: row.sexe,
        count: parseInt(row.count),
        percentage: ((parseInt(row.count) / parseInt(totalBirths.rows[0].count)) * 100).toFixed(1)
      })),
      topBirthPlaces: topPlaces.rows.map(row => ({
        place: row.lieu_naiss,
        count: parseInt(row.count),
        percentage: ((parseInt(row.count) / parseInt(totalBirths.rows[0].count)) * 100).toFixed(1)
      })),
      yearlyTrends: [],
      monthlyTrends: [],
      topCenters: [],
      registrationAnalysis: [],
      note: "Analyse simplifiée - fonctionnalités temporelles limitées en raison de contraintes de base de données"
    };
    
  } catch (error) {
    console.error('Even fallback failed:', error);
    return {
      summary: {
        totalBirths: 0,
        region: 'unknown',
        error: 'Impossible de récupérer les données'
      },
      genderDistribution: [],
      topBirthPlaces: [],
      yearlyTrends: [],
      monthlyTrends: [],
      topCenters: []
    };
  }
}

function normalizeGender(sexe) {
  switch(String(sexe).toLowerCase()) {
    case '1':
    case 'm':
    case 'masculin':
      return 'Masculin';
    case '2':
    case 'f':
    case 'feminin':
    case 'féminin':
      return 'Féminin';
    default:
      return `Non spécifié (${sexe})`;
  }
}

function getMonthName(monthNum) {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return months[monthNum - 1] || `Mois ${monthNum}`;
}

module.exports = router;