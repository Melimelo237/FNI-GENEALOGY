// backend/src/routes/genealogy.js
const express = require('express');
const pool = require('../../db');
const NodeCache = require('node-cache');
const router = express.Router();

// Cache avec TTL de 1 heure pour les arbres généalogiques
const treeCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// ============= OPTIMISATIONS BASE DE DONNÉES =============
// Créer ces index CRITIQUES pour la performance :
/*
CREATE INDEX idx_backup_test_search_parents ON backup_test(
  noms_enfant, prenoms_enfant, date_naiss, lieu_naiss, sexe
);

CREATE INDEX idx_backup_test_find_children ON backup_test(
  noms_pere, date_pere, lieu_naiss_pere,
  noms_mere, date_mere, lieu_naiss_mere
);

CREATE INDEX idx_backup_test_act_number ON backup_test(num_acte);

-- Index de recherche textuelle pour les noms (PostgreSQL)
CREATE INDEX idx_backup_test_fulltext ON backup_test USING gin(
  to_tsvector('french', noms_enfant || ' ' || COALESCE(prenoms_enfant, ''))
);
*/

// ============= FONCTIONS PRINCIPALES =============

/**
 * Recherche par numéro d'acte - Ultra rapide avec index
 */
router.get('/search-by-act', async (req, res) => {
  try {
    const { actNumber } = req.query;
    
    if (!actNumber) {
      return res.status(400).json({
        success: false,
        error: 'Numéro d\'acte requis'
      });
    }

    // Vérifier le cache d'abord
    const cacheKey = `act_${actNumber}`;
    const cached = treeCache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        person: cached,
        fromCache: true
      });
    }

    const result = await pool.query(`
      SELECT 
        id,
        noms_enfant,
        prenoms_enfant,
        date_naiss,
        lieu_naiss,
        sexe,
        noms_pere,
        date_pere,
        lieu_naiss_pere,
        noms_mere,
        date_mere,
        lieu_naiss_mere,
        num_acte,
        centre_etat
      FROM backup_test 
      WHERE num_acte = $1
      LIMIT 1
    `, [actNumber]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Personne non trouvée'
      });
    }
    
    const person = result.rows[0];
    treeCache.set(cacheKey, person);
    
    res.json({
      success: true,
      person
    });
    
  } catch (error) {
    console.error('Search by act error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la recherche'
    });
  }
});

/**
 * Trouver les PARENTS d'une personne - Algorithme optimisé
 * Utilise les invariants : date et lieu de naissance
 */
router.get('/find-parents/:personId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { personId } = req.params;
    
    // Cache check
    const cacheKey = `parents_${personId}`;
    const cached = treeCache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        parents: cached,
        fromCache: true
      });
    }
    
    // 1. Récupérer les informations de la personne
    const personResult = await client.query(`
      SELECT 
        noms_pere, date_pere, lieu_naiss_pere,
        noms_mere, date_mere, lieu_naiss_mere
      FROM backup_test 
      WHERE id = $1
    `, [personId]);
    
    if (personResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Personne non trouvée'
      });
    }
    
    const person = personResult.rows[0];
    const parents = { father: null, mother: null };
    
    // 2. Recherche du PÈRE avec matching intelligent
    if (person.noms_pere && person.date_pere) {
      const fatherQuery = `
        SELECT 
          id,
          noms_enfant,
          prenoms_enfant,
          date_naiss,
          lieu_naiss,
          sexe,
          noms_pere,
          noms_mere,
          num_acte
        FROM backup_test
        WHERE 
          sexe = '1'  -- Masculin
          AND (
            -- Matching exact sur nom complet
            LOWER(CONCAT(noms_enfant, ' ', COALESCE(prenoms_enfant, ''))) = LOWER($1)
            OR LOWER(noms_enfant) = LOWER($1)
          )
          AND DATE(date_naiss) = DATE($2)
          ${person.lieu_naiss_pere ? 'AND LOWER(lieu_naiss) = LOWER($3)' : ''}
        LIMIT 1
      `;
      
      const fatherParams = [
        person.noms_pere,
        person.date_pere
      ];
      
      if (person.lieu_naiss_pere) {
        fatherParams.push(person.lieu_naiss_pere);
      }
      
      const fatherResult = await client.query(fatherQuery, fatherParams);
      if (fatherResult.rows.length > 0) {
        parents.father = fatherResult.rows[0];
      }
    }
    
    // 3. Recherche de la MÈRE avec matching intelligent
    if (person.noms_mere && person.date_mere) {
      const motherQuery = `
        SELECT 
          id,
          noms_enfant,
          prenoms_enfant,
          date_naiss,
          lieu_naiss,
          sexe,
          noms_pere,
          noms_mere,
          num_acte
        FROM backup_test
        WHERE 
          sexe = '2'  -- Féminin
          AND (
            LOWER(CONCAT(noms_enfant, ' ', COALESCE(prenoms_enfant, ''))) = LOWER($1)
            OR LOWER(noms_enfant) = LOWER($1)
          )
          AND DATE(date_naiss) = DATE($2)
          ${person.lieu_naiss_mere ? 'AND LOWER(lieu_naiss) = LOWER($3)' : ''}
        LIMIT 1
      `;
      
      const motherParams = [
        person.noms_mere,
        person.date_mere
      ];
      
      if (person.lieu_naiss_mere) {
        motherParams.push(person.lieu_naiss_mere);
      }
      
      const motherResult = await client.query(motherQuery, motherParams);
      if (motherResult.rows.length > 0) {
        parents.mother = motherResult.rows[0];
      }
    }
    
    // Mise en cache
    treeCache.set(cacheKey, parents);
    
    res.json({
      success: true,
      parents,
      metadata: {
        fatherFound: !!parents.father,
        motherFound: !!parents.mother,
        matchingMethod: 'invariant-based'
      }
    });
    
  } catch (error) {
    console.error('Find parents error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la recherche des parents'
    });
  } finally {
    client.release();
  }
});

/**
 * Trouver les ENFANTS d'une personne - Algorithme inversé
 */
router.get('/find-children/:personId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { personId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // Cache check
    const cacheKey = `children_${personId}_${limit}_${offset}`;
    const cached = treeCache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        children: cached,
        fromCache: true
      });
    }
    
    // 1. Récupérer les informations de la personne
    const personResult = await client.query(`
      SELECT 
        id,
        noms_enfant,
        prenoms_enfant,
        date_naiss,
        lieu_naiss,
        sexe
      FROM backup_test 
      WHERE id = $1
    `, [personId]);
    
    if (personResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Personne non trouvée'
      });
    }
    
    const person = personResult.rows[0];
    const fullName = `${person.noms_enfant} ${person.prenoms_enfant || ''}`.trim();
    
    // 2. Construire la requête selon le sexe
    let childrenQuery;
    let queryParams;
    
    if (person.sexe === '1') {
      // Si c'est un homme, chercher où il apparaît comme père
      childrenQuery = `
        SELECT 
          id,
          noms_enfant,
          prenoms_enfant,
          date_naiss,
          lieu_naiss,
          sexe,
          noms_pere,
          noms_mere,
          num_acte
        FROM backup_test
        WHERE 
          (
            LOWER(noms_pere) = LOWER($1)
            OR LOWER(noms_pere) = LOWER($2)
          )
          AND DATE(date_pere) = DATE($3)
          ${person.lieu_naiss ? 'AND LOWER(lieu_naiss_pere) = LOWER($4)' : ''}
        ORDER BY date_naiss DESC
        LIMIT $${person.lieu_naiss ? 5 : 4} OFFSET $${person.lieu_naiss ? 6 : 5}
      `;
      
      queryParams = [
        fullName,
        person.noms_enfant,
        person.date_naiss,
        ...(person.lieu_naiss ? [person.lieu_naiss] : []),
        parseInt(limit),
        parseInt(offset)
      ];
      
    } else if (person.sexe === '2') {
      // Si c'est une femme, chercher où elle apparaît comme mère
      childrenQuery = `
        SELECT 
          id,
          noms_enfant,
          prenoms_enfant,
          date_naiss,
          lieu_naiss,
          sexe,
          noms_pere,
          noms_mere,
          num_acte
        FROM backup_test
        WHERE 
          (
            LOWER(noms_mere) = LOWER($1)
            OR LOWER(noms_mere) = LOWER($2)
          )
          AND DATE(date_mere) = DATE($3)
          ${person.lieu_naiss ? 'AND LOWER(lieu_naiss_mere) = LOWER($4)' : ''}
        ORDER BY date_naiss DESC
        LIMIT $${person.lieu_naiss ? 5 : 4} OFFSET $${person.lieu_naiss ? 6 : 5}
      `;
      
      queryParams = [
        fullName,
        person.noms_enfant,
        person.date_naiss,
        ...(person.lieu_naiss ? [person.lieu_naiss] : []),
        parseInt(limit),
        parseInt(offset)
      ];
      
    } else {
      // Sexe non spécifié, chercher dans les deux cas
      childrenQuery = `
        SELECT 
          id,
          noms_enfant,
          prenoms_enfant,
          date_naiss,
          lieu_naiss,
          sexe,
          noms_pere,
          noms_mere,
          num_acte
        FROM backup_test
        WHERE 
          (
            (LOWER(noms_pere) = LOWER($1) AND DATE(date_pere) = DATE($2))
            OR (LOWER(noms_mere) = LOWER($1) AND DATE(date_mere) = DATE($2))
          )
        ORDER BY date_naiss DESC
        LIMIT $3 OFFSET $4
      `;
      
      queryParams = [
        fullName,
        person.date_naiss,
        parseInt(limit),
        parseInt(offset)
      ];
    }
    
    const childrenResult = await client.query(childrenQuery, queryParams);
    
    // Mise en cache
    treeCache.set(cacheKey, childrenResult.rows);
    
    res.json({
      success: true,
      children: childrenResult.rows,
      metadata: {
        total: childrenResult.rows.length,
        parentGender: person.sexe === '1' ? 'father' : person.sexe === '2' ? 'mother' : 'unknown',
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
    
  } catch (error) {
    console.error('Find children error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la recherche des enfants'
    });
  } finally {
    client.release();
  }
});

/**
 * Trouver les FRÈRES ET SŒURS (siblings)
 */
router.get('/find-siblings/:personId', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { personId } = req.params;
    
    // Cache check
    const cacheKey = `siblings_${personId}`;
    const cached = treeCache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        siblings: cached,
        fromCache: true
      });
    }
    
    // 1. Récupérer les parents de la personne
    const personResult = await client.query(`
      SELECT 
        noms_pere,
        date_pere,
        noms_mere,
        date_mere
      FROM backup_test 
      WHERE id = $1
    `, [personId]);
    
    if (personResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Personne non trouvée'
      });
    }
    
    const person = personResult.rows[0];
    
    // 2. Chercher tous les enfants ayant les mêmes parents
    const siblingsQuery = `
      SELECT 
        id,
        noms_enfant,
        prenoms_enfant,
        date_naiss,
        lieu_naiss,
        sexe,
        num_acte
      FROM backup_test
      WHERE 
        id != $1  -- Exclure la personne elle-même
        AND (
          -- Mêmes deux parents
          (
            noms_pere = $2 AND date_pere = $3 
            AND noms_mere = $4 AND date_mere = $5
          )
          OR
          -- Même père seulement (demi-frères/sœurs paternels)
          (
            noms_pere = $2 AND date_pere = $3
            AND noms_pere IS NOT NULL
          )
          OR
          -- Même mère seulement (demi-frères/sœurs maternels)
          (
            noms_mere = $4 AND date_mere = $5
            AND noms_mere IS NOT NULL
          )
        )
      ORDER BY date_naiss
    `;
    
    const siblingsResult = await client.query(siblingsQuery, [
      personId,
      person.noms_pere,
      person.date_pere,
      person.noms_mere,
      person.date_mere
    ]);
    
    // Classer les siblings
    const siblings = siblingsResult.rows.map(sibling => {
      const isSameFather = sibling.noms_pere === person.noms_pere && 
                           sibling.date_pere === person.date_pere;
      const isSameMother = sibling.noms_mere === person.noms_mere && 
                           sibling.date_mere === person.date_mere;
      
      return {
        ...sibling,
        relationship: isSameFather && isSameMother ? 'full_sibling' : 
                     isSameFather ? 'half_sibling_paternal' : 
                     'half_sibling_maternal'
      };
    });
    
    // Mise en cache
    treeCache.set(cacheKey, siblings);
    
    res.json({
      success: true,
      siblings,
      metadata: {
        total: siblings.length,
        fullSiblings: siblings.filter(s => s.relationship === 'full_sibling').length,
        halfSiblings: siblings.filter(s => s.relationship !== 'full_sibling').length
      }
    });
    
  } catch (error) {
    console.error('Find siblings error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la recherche des frères et sœurs'
    });
  } finally {
    client.release();
  }
});

/**
 * Construction de l'arbre généalogique complet optimisé
 */
router.get('/build-tree/:personId', async (req, res) => {
  try {
    const { personId } = req.params;
    const { depth = 2 } = req.query; // Profondeur de l'arbre (générations)
    
    // Construction parallèle pour performance optimale
    const [person, parents, children, siblings] = await Promise.all([
      getPersonById(personId),
      getParents(personId),
      getChildren(personId),
      getSiblings(personId)
    ]);
    
    if (!person) {
      return res.status(404).json({
        success: false,
        error: 'Personne non trouvée'
      });
    }
    
    // Construction récursive si depth > 1
    const tree = {
      root: person,
      parents: parents,
      children: children,
      siblings: siblings,
      metadata: {
        depth: parseInt(depth),
        totalNodes: 1 + 
                   (parents.father ? 1 : 0) + 
                   (parents.mother ? 1 : 0) + 
                   children.length + 
                   siblings.length,
        generatedAt: new Date().toISOString()
      }
    };
    
    // Si depth > 1, récupérer les grands-parents et petits-enfants
    if (parseInt(depth) > 1) {
      if (parents.father) {
        tree.parents.father.parents = await getParents(parents.father.id);
      }
      if (parents.mother) {
        tree.parents.mother.parents = await getParents(parents.mother.id);
      }
      
      for (const child of children) {
        child.children = await getChildren(child.id);
        tree.metadata.totalNodes += child.children.length;
      }
    }
    
    res.json({
      success: true,
      tree
    });
    
  } catch (error) {
    console.error('Build tree error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la construction de l\'arbre'
    });
  }
});

// ============= FONCTIONS UTILITAIRES =============

async function getPersonById(id) {
  const result = await pool.query(`
    SELECT * FROM backup_test WHERE id = $1
  `, [id]);
  return result.rows[0] || null;
}

async function getParents(personId) {
  const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/genealogy/find-parents/${personId}`);
  const data = await response.json();
  return data.parents || { father: null, mother: null };
}

async function getChildren(personId) {
  const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/genealogy/find-children/${personId}`);
  const data = await response.json();
  return data.children || [];
}

async function getSiblings(personId) {
  const response = await fetch(`http://localhost:${process.env.PORT || 5000}/api/genealogy/find-siblings/${personId}`);
  const data = await response.json();
  return data.siblings || [];
}

// ============= ROUTE DE MONITORING =============
router.get('/cache-stats', (req, res) => {
  res.json({
    cacheSize: treeCache.keys().length,
    cacheHits: treeCache.getStats().hits,
    cacheMisses: treeCache.getStats().misses,
    cacheKeys: treeCache.keys()
  });
});

module.exports = router;
