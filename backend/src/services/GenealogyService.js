// ====================================
// backend/src/services/GenealogyService.js
const Person = require('../models/Person');
const pool = require('../db');

class GenealogyService {
  static async generateFamilyTree(personId, generations = 3) {
    try {
      const rootPerson = await Person.getById(personId);
      if (!rootPerson) {
        throw new Error('Personne non trouvée');
      }

      const tree = {
        root: rootPerson,
        ancestors: await this.getAncestors(personId, generations),
        descendants: await this.getDescendants(personId, generations),
        siblings: await this.getSiblings(personId),
        spouse: await this.getSpouse(personId)
      };

      return tree;
    } catch (error) {
      console.error('Tree generation error:', error);
      throw error;
    }
  }

  static async getAncestors(personId, generations) {
    if (generations <= 0) return [];
    
    try {
      const person = await Person.getById(personId);
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
        FROM backup_test 
        WHERE (noms_enfant = $1 OR noms_enfant = $2)
          AND date_naiss < $3
        ORDER BY date_naiss
        LIMIT 2
      `, [person.noms_pere, person.noms_mere, person.date_naiss]);

      const parents = parentsResult.rows;
      const ancestors = [];

      // Récursion pour les générations précédentes
      for (const parent of parents) {
        const parentAncestors = await this.getAncestors(parent.id, generations - 1);
        ancestors.push({
          ...parent,
          ancestors: parentAncestors
        });
      }

      return ancestors;
    } catch (error) {
      console.error('Get ancestors error:', error);
      return [];
    }
  }

  static async getDescendants(personId, generations) {
    if (generations <= 0) return [];

    try {
      const person = await Person.getById(personId);
      if (!person) return [];

      // Rechercher les enfants
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
        FROM backup_test 
        WHERE (noms_pere LIKE $1 OR noms_mere LIKE $1)
          AND date_naiss > $2
        ORDER BY date_naiss
        LIMIT 20
      `, [`%${person.noms_enfant}%`, person.date_naiss]);

      const children = childrenResult.rows;
      const descendants = [];

      // Récursion pour les générations suivantes
      for (const child of children) {
        const childDescendants = await this.getDescendants(child.id, generations - 1);
        descendants.push({
          ...child,
          descendants: childDescendants
        });
      }

      return descendants;
    } catch (error) {
      console.error('Get descendants error:', error);
      return [];
    }
  }

  static async getSiblings(personId) {
    try {
      const person = await Person.getById(personId);
      if (!person) return [];

      const siblingsResult = await pool.query(`
        SELECT 
          id,
          noms_enfant || ' ' || COALESCE(prenoms_enfant, '') as full_name,
          noms_enfant,
          prenoms_enfant,
          date_naiss,
          lieu_naiss,
          sexe
        FROM backup_test 
        WHERE noms_pere = $1 
          AND noms_mere = $2 
          AND id != $3
        ORDER BY date_naiss
      `, [person.noms_pere, person.noms_mere, personId]);

      return siblingsResult.rows;
    } catch (error) {
      console.error('Get siblings error:', error);
      return [];
    }
  }

  static async getSpouse(personId) {
    try {
      const person = await Person.getById(personId);
      if (!person) return null;

      const spouseResult = await pool.query(`
        SELECT 
          CASE 
            WHEN noms_epoux LIKE $1 THEN noms_epouse
            WHEN noms_epouse LIKE $1 THEN noms_epoux
          END as spouse_name,
          date_mariage,
          lieu_mariage,
          regime
        FROM mariage 
        WHERE noms_epoux LIKE $1 OR noms_epouse LIKE $1
        LIMIT 1
      `, [`%${person.noms_enfant}%`]);

      return spouseResult.rows[0] || null;
    } catch (error) {
      console.error('Get spouse error:', error);
      return null;
    }
  }
}

module.exports = GenealogyService;
