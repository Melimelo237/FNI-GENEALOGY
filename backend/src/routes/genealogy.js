// backend/src/routes/genealogy.js (VERSION OPTIMALE)
const express = require('express');
const pool = require('../../db');
const router = express.Router();

// Génération d'arbre généalogique intelligent
router.get('/tree', async (req, res) => {
  try {
    const { id, generations = 3 } = req.query;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID requis en paramètre ?id=123'
      });
    }
    
    const tree = await generateFamilyTree(id, parseInt(generations));
    
    if (!tree) {
      return res.status(404).json({
        success: false,
        error: 'Personne non trouvée'
      });
    }
    
    res.json({
      success: true,
      tree,
      metadata: {
        generatedAt: new Date().toISOString(),
        generations: parseInt(generations),
        rootPersonId: id
      }
    });
    
  } catch (error) {
    console.error('Tree generation error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la génération de l\'arbre',
      details: error.message 
    });
  }
});

// Ajouter cette route pour la recherche par numéro d'acte
router.get('/search-by-act', async (req, res) => {
  try {
    const { actNumber } = req.query;
    
    if (!actNumber) {
      return res.status(400).json({
        success: false,
        error: 'Numéro d\'acte requis en paramètre ?actNumber=XXX'
      });
    }
    
    const result = await pool.query(`
      SELECT 
        id,
        noms_enfant || ' ' || COALESCE(prenoms_enfant, '') as full_name,
        noms_enfant,
        prenoms_enfant,
        date_naiss,
        lieu_naiss,
        sexe,
        noms_pere,
        noms_mere,
        num_acte,
        centre_etat
      FROM naissance 
      WHERE num_acte = $1
      LIMIT 1
    `, [actNumber]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aucune personne trouvée avec ce numéro d\'acte'
      });
    }
    
    res.json({
      success: true,
      person: result.rows[0]
    });
    
  } catch (error) {
    console.error('Search by act number error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la recherche par numéro d\'acte',
      details: error.message 
    });
  }
});

// Relations familiales d'une personne
router.get('/relations', async (req, res) => {
  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'ID requis en paramètre ?id=123'
      });
    }
    
    const relations = await getPersonRelations(id);
    
    if (!relations.person) {
      return res.status(404).json({
        success: false,
        error: 'Personne non trouvée'
      });
    }
    
    res.json({
      success: true,
      relations
    });
    
  } catch (error) {
    console.error('Relations error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors de la recherche des relations',
      details: error.message 
    });
  }
});

async function generateFamilyTree(personId, generations) {
  const person = await getPersonById(personId);
  if (!person) return null;
  
  const tree = {
    root: person,
    ancestors: await getAncestors(personId, generations - 1),
    descendants: await getDescendants(personId, generations - 1),
    siblings: await getSiblings(personId),
    spouse: await getSpouse(personId),
    stats: {
      totalMembers: 1,
      generations: generations,
      ancestorsFound: 0,
      descendantsFound: 0,
      siblingsFound: 0
    }
  };
  
  // Calculer les stats
  tree.stats.ancestorsFound = countTreeMembers(tree.ancestors);
  tree.stats.descendantsFound = countTreeMembers(tree.descendants);
  tree.stats.siblingsFound = tree.siblings.length;
  tree.stats.totalMembers = 1 + tree.stats.ancestorsFound + tree.stats.descendantsFound + tree.stats.siblingsFound;
  
  return tree;
}

async function getPersonById(id) {
  const result = await pool.query(`
    SELECT 
      id,
      noms_enfant || ' ' || COALESCE(prenoms_enfant, '') as full_name,
      noms_enfant,
      prenoms_enfant,
      date_naiss,
      lieu_naiss,
      sexe,
      noms_pere,
      noms_mere
    FROM naissance 
    WHERE id = $1
  `, [id]);
  
  return result.rows[0] || null;
}

async function getAncestors(personId, generations) {
  if (generations <= 0) return [];
  
  const person = await getPersonById(personId);
  if (!person || !person.noms_pere || !person.noms_mere) return [];
  
  // Rechercher les parents
  const parentsResult = await pool.query(`
    SELECT DISTINCT
      id,
      noms_enfant || ' ' || COALESCE(prenoms_enfant, '') as full_name,
      noms_enfant,
      prenoms_enfant,
      date_naiss,
      lieu_naiss,
      sexe,
      noms_pere,
      noms_mere
    FROM naissance 
    WHERE (noms_enfant = $1 OR noms_enfant = $2)
      AND date_naiss < $3
    ORDER BY date_naiss
    LIMIT 2
  `, [person.noms_pere, person.noms_mere, person.date_naiss]);
  
  const parents = [];
  for (const parent of parentsResult.rows) {
    const parentAncestors = await getAncestors(parent.id, generations - 1);
    parents.push({
      ...parent,
      ancestors: parentAncestors
    });
  }
  
  return parents;
}

async function getDescendants(personId, generations) {
  if (generations <= 0) return [];
  
  const person = await getPersonById(personId);
  if (!person) return [];
  
  const childrenResult = await pool.query(`
    SELECT DISTINCT
      id,
      noms_enfant || ' ' || COALESCE(prenoms_enfant, '') as full_name,
      noms_enfant,
      prenoms_enfant,
      date_naiss,
      lieu_naiss,
      sexe,
      noms_pere,
      noms_mere
    FROM naissance 
    WHERE (noms_pere ILIKE $1 OR noms_mere ILIKE $1)
      AND date_naiss > $2
    ORDER BY date_naiss
    LIMIT 20
  `, [`%${person.noms_enfant}%`, person.date_naiss]);
  
  const children = [];
  for (const child of childrenResult.rows) {
    const childDescendants = await getDescendants(child.id, generations - 1);
    children.push({
      ...child,
      descendants: childDescendants
    });
  }
  
  return children;
}

async function getSiblings(personId) {
  const person = await getPersonById(personId);
  if (!person || !person.noms_pere || !person.noms_mere) return [];
  
  const siblingsResult = await pool.query(`
    SELECT 
      id,
      noms_enfant || ' ' || COALESCE(prenoms_enfant, '') as full_name,
      noms_enfant,
      prenoms_enfant,
      date_naiss,
      lieu_naiss,
      sexe
    FROM naissance 
    WHERE noms_pere = $1 
      AND noms_mere = $2 
      AND id != $3
    ORDER BY date_naiss
  `, [person.noms_pere, person.noms_mere, personId]);
  
  return siblingsResult.rows;
}

async function getSpouse(personId) {
  const person = await getPersonById(personId);
  if (!person) return null;
  
  const spouseResult = await pool.query(`
    SELECT 
      CASE 
        WHEN noms_epoux ILIKE $1 THEN noms_epouse
        WHEN noms_epouse ILIKE $1 THEN noms_epoux
      END as spouse_name,
      date_mariage,
      lieu_mariage,
      regime
    FROM mariage 
    WHERE noms_epoux ILIKE $1 OR noms_epouse ILIKE $1
    LIMIT 1
  `, [`%${person.noms_enfant}%`]);
  
  return spouseResult.rows[0] || null;
}

function countTreeMembers(tree) {
  if (!Array.isArray(tree)) return 0;
  
  let count = tree.length;
  for (const member of tree) {
    if (member.ancestors) count += countTreeMembers(member.ancestors);
    if (member.descendants) count += countTreeMembers(member.descendants);
  }
  return count;
}

async function getPersonRelations(personId) {
  const person = await getPersonById(personId);
  if (!person) return { person: null };
  
  const [siblings, children, spouse] = await Promise.all([
    getSiblings(personId),
    getDescendants(personId, 1),
    getSpouse(personId)
  ]);
  
  return {
    person,
    siblings,
    children: children.flat(),
    spouse,
    summary: {
      siblingsCount: siblings.length,
      childrenCount: children.flat().length,
      hasSpouse: !!spouse
    }
  };
}

module.exports = router;
