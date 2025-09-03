// ====================================
// backend/src/models/Person.js
class Person {
  static async searchAdvanced(filters = {}) {
    const { pool } = require('../../server');
    
    let query = `
      SELECT DISTINCT
        n.id,
        n.noms_enfant || ' ' || COALESCE(n.prenoms_enfant, '') as full_name,
        n.noms_enfant,
        n.prenoms_enfant,
        n.date_naiss,
        n.lieu_naiss,
        n.sexe,
        n.noms_pere,
        n.noms_mere,
        n.num_acte,
        n.centre_etat,
        'naissance' as source_type
      FROM naissance n
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    // Filtres de recherche
    if (filters.q) {
      query += ` AND (
        LOWER(n.noms_enfant) LIKE $${paramIndex} OR 
        LOWER(n.prenoms_enfant) LIKE $${paramIndex} OR
        LOWER(n.noms_pere) LIKE $${paramIndex} OR
        LOWER(n.noms_mere) LIKE $${paramIndex}
      )`;
      params.push(`%${filters.q.toLowerCase()}%`);
      paramIndex++;
    }
    
    if (filters.birthDateFrom) {
      query += ` AND n.date_naiss >= $${paramIndex}`;
      params.push(filters.birthDateFrom);
      paramIndex++;
    }
    
    if (filters.birthDateTo) {
      query += ` AND n.date_naiss <= $${paramIndex}`;
      params.push(filters.birthDateTo);
      paramIndex++;
    }
    
    if (filters.birthPlace) {
      query += ` AND LOWER(n.lieu_naiss) LIKE $${paramIndex}`;
      params.push(`%${filters.birthPlace.toLowerCase()}%`);
      paramIndex++;
    }
    
    if (filters.gender) {
      query += ` AND n.sexe = $${paramIndex}`;
      params.push(filters.gender);
      paramIndex++;
    }
    
    query += ` ORDER BY n.date_naiss DESC LIMIT 100`;
    
    try {
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }
  
  static async getById(personId) {
    const { pool } = require('../../server');
    
    try {
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
          centre_etat,
          profession_pere,
          profession_mere,
          domicile_mere,
          domicile_pere,
          nationalite_pere,
          nationalite_mere
        FROM naissance 
        WHERE id = $1
      `, [personId]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Get person error:', error);
      throw error;
    }
  }
  
  static async getFamily(personId) {
    const { pool } = require('../../server');
    
    try {
      // Récupérer les informations de la personne principale
      const person = await this.getById(personId);
      if (!person) return null;
      
      // Rechercher les frères et sœurs (même parents)
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
        WHERE (noms_pere = $1 OR noms_mere = $2) 
          AND id != $3
          AND noms_pere IS NOT NULL 
          AND noms_mere IS NOT NULL
        LIMIT 20
      `, [person.noms_pere, person.noms_mere, personId]);
      
      // Rechercher les enfants (en tant que parent dans les mariages puis naissances)
      const childrenResult = await pool.query(`
        SELECT DISTINCT
          n.id,
          n.noms_enfant || ' ' || COALESCE(n.prenoms_enfant, '') as full_name,
          n.noms_enfant,
          n.prenoms_enfant,
          n.date_naiss,
          n.lieu_naiss,
          n.sexe
        FROM naissance n
        WHERE n.noms_pere LIKE $1 OR n.noms_mere LIKE $1
        LIMIT 20
      `, [`%${person.noms_enfant}%`]);
      
      // Rechercher le conjoint dans la table mariage
      const spouseResult = await pool.query(`
        SELECT 
          CASE 
            WHEN noms_epoux LIKE $1 THEN noms_epouse
            WHEN noms_epouse LIKE $1 THEN noms_epoux
          END as spouse_name,
          date_mariage,
          lieu_mariage
        FROM mariage 
        WHERE noms_epoux LIKE $1 OR noms_epouse LIKE $1
        LIMIT 1
      `, [`%${person.noms_enfant}%`]);
      
      return {
        person,
        siblings: siblingsResult.rows,
        children: childrenResult.rows,
        spouse: spouseResult.rows[0] || null
      };
      
    } catch (error) {
      console.error('Get family error:', error);
      throw error;
    }
  }
}

module.exports = Person;