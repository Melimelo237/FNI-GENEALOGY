// src/routes/chat.js (VERSION OPTIMALE)
const express = require('express');
const pool = require('../../db');
const router = express.Router();

// Chat avec l'assistant IA
router.post('/message', async (req, res) => {
  try {
    const { message, context = {} } = req.body;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ 
        success: false,
        error: 'Message requis' 
      });
    }
    
    const response = await processAdvancedMessage(message.toLowerCase().trim(), context);
    
    res.json({
      success: true,
      ...response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors du traitement du message',
      response: "Désolé, je rencontre un problème technique. Pouvez-vous reformuler votre question ?",
      suggestions: ['Réessayer', 'Contact support']
    });
  }
});

async function processAdvancedMessage(message, context) {
  // Classification avancée de l'intention
  const intent = classifyIntent(message);
  
  switch (intent.type) {
    case 'search':
      return await handleSearchQuery(message, intent.entities);
    case 'procedure_birth':
      return handleBirthProcedure(intent.entities);
    case 'procedure_marriage':
      return handleMarriageProcedure(intent.entities);
    case 'procedure_death':
      return handleDeathProcedure(intent.entities);
    case 'contact':
      return handleContactQuery(intent.entities);
    case 'genealogy':
      return handleGenealogyQuery(intent.entities);
    case 'statistics':
      return await handleStatisticsQuery(intent.entities);
    default:
      return handleGeneralQuery(message);
  }
}

function classifyIntent(message) {
  const entities = extractEntities(message);
  
  // Mots-clés pour classification
  const keywords = {
    search: ['recherch', 'trouv', 'cherch', 'nom', 'personne'],
    procedure_birth: ['naissance', 'né', 'bébé', 'enfant', 'accouchement', 'acte de naissance'],
    procedure_marriage: ['mariage', 'marier', 'époux', 'épouse', 'union', 'conjoint'],
    procedure_death: ['décès', 'mort', 'décédé', 'enterrement', 'funérailles'],
    contact: ['contact', 'téléphone', 'adresse', 'bureau', 'horaire'],
    genealogy: ['famille', 'arbre', 'généalogie', 'parent', 'enfant', 'frère', 'sœur'],
    statistics: ['statistique', 'nombre', 'combien', 'total', 'analyse']
  };
  
  for (const [type, words] of Object.entries(keywords)) {
    if (words.some(word => message.includes(word))) {
      return { type, entities, confidence: 0.8 };
    }
  }
  
  return { type: 'general', entities, confidence: 0.5 };
}

function extractEntities(message) {
  const entities = {
    names: [],
    places: [],
    dates: [],
    numbers: []
  };
  
  // Extraction de noms (pattern simple)
  const nameMatches = message.match(/([A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ][a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]+\s+[A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞŸ][a-zà�âãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]+)/g);
  if (nameMatches) {
    entities.names = nameMatches;
  }
  
  // Extraction de nombres
  const numberMatches = message.match(/\d+/g);
  if (numberMatches) {
    entities.numbers = numberMatches.map(n => parseInt(n));
  }
  
  return entities;
}

async function handleSearchQuery(message, entities) {
  if (entities.names.length > 0) {
    const name = entities.names[0];
    try {
      const searchResult = await pool.query(`
        SELECT 
          COUNT(*) as count,
          array_agg(
            json_build_object(
              'id', id,
              'name', noms_enfant || ' ' || COALESCE(prenoms_enfant, ''),
              'birthDate', date_naiss,
              'birthPlace', lieu_naiss
            )
          ) FILTER (WHERE id IS NOT NULL) as persons
        FROM naissance 
        WHERE LOWER(noms_enfant) ILIKE LOWER($1) 
           OR LOWER(prenoms_enfant) ILIKE LOWER($1)
        LIMIT 5
      `, [`%${name}%`]);
      
      const count = parseInt(searchResult.rows[0].count);
      const persons = searchResult.rows[0].persons || [];
      
      if (count > 0) {
        let response = `✅ **Résultats pour "${name}"** - ${count} personne(s) trouvée(s) :\n\n`;
        
        persons.slice(0, 3).forEach((person, index) => {
          const birthDate = person.birthDate ? new Date(person.birthDate).toLocaleDateString('fr-FR') : 'Non renseignée';
          response += `${index + 1}. **${person.name}**\n`;
          response += `   • Né(e) le : ${birthDate}\n`;
          response += `   • Lieu : ${person.birthPlace || 'Non renseigné'}\n\n`;
        });
        
        if (count > 3) {
          response += `... et ${count - 3} autre(s) personne(s)\n\n`;
        }
        
        response += `Voulez-vous voir plus de détails ou générer un arbre généalogique ?`;
        
        return {
          response,
          suggestions: [
            'Voir arbre généalogique',
            'Plus de détails',
            'Nouvelle recherche',
            'Recherche avancée'
          ],
          data: { searchResults: persons }
        };
      } else {
        return {
          response: `❌ Aucune personne trouvée avec le nom "${name}" dans le FNI.\n\n💡 **Suggestions :**\n• Vérifiez l'orthographe\n• Essayez avec le nom de famille uniquement\n• Utilisez des termes plus généraux`,
          suggestions: ['Nouvelle recherche', 'Aide recherche', 'Contact BUNEC']
        };
      }
    } catch (error) {
      return {
        response: 'Erreur lors de la recherche. Veuillez réessayer.',
        suggestions: ['Réessayer', 'Contact support']
      };
    }
  }
  
  return {
    response: `🔍 **Recherche dans le FNI**\n\nPour effectuer une recherche efficace, donnez-moi :\n• Le nom et prénom de la personne\n• La date de naissance (si connue)\n• Le lieu de naissance\n\n💬 **Exemple :** "Rechercher Jean KAMDEM né en 1985"`,
    suggestions: ['Recherche par nom', 'Recherche avancée', 'Aide FNI']
  };
}

function handleBirthProcedure(entities) {
  return {
    response: `🍼 **Procédure d'acte de naissance au Cameroun**\n\n📋 **Documents nécessaires :**\n• Certificat médical d'accouchement\n• Pièces d'identité des parents (CNI ou passeport)\n• Certificat de mariage des parents (si applicable)\n• Déclaration sur l'honneur (si hors délai)\n\n⏰ **Délais et coûts :**\n• **Gratuit** : dans les 45 jours suivant la naissance\n• **1 500 FCFA** : après 45 jours\n• **Procédure judiciaire** : après 1 an (coût variable)\n\n📍 **Où déposer :**\nCentre d'état civil de la commune de naissance\n\n⚠️ **Important :** La déclaration est obligatoire !`,
    suggestions: [
      'Documents pour parents étrangers',
      'Procédure hors délai',
      'Centres d\'état civil',
      'Acte de naissance par jugement'
    ]
  };
}

function handleMarriageProcedure(entities) {
  return {
    response: `💒 **Procédure de mariage civil au Cameroun**\n\n📋 **Documents requis (chaque époux) :**\n• Acte de naissance (moins de 6 mois)\n• Certificat médical (moins de 3 mois)\n• Certificat de célibat\n• 4 photos d'identité récentes\n• Pièce d'identité valide\n\n👥 **Témoins :**\n4 témoins majeurs (2 par époux) avec pièces d'identité\n\n⏳ **Procédure :**\n1. **Dépôt du dossier** à la mairie\n2. **Publication des bans** (10 jours minimum)\n3. **Célébration** par l'officier d'état civil\n\n💰 **Coût total :** 15 000 à 25 000 FCFA\n⏰ **Délai minimum :** 15 jours après dépôt`,
    suggestions: [
      'Certificat de célibat',
      'Mariage avec étranger',
      'Publication des bans',
      'Régime matrimonial'
    ]
  };
}

function handleDeathProcedure(entities) {
  return {
    response: `⚱️ **Déclaration de décès au Cameroun**\n\n📋 **Documents requis :**\n• Certificat médical de décès\n• Pièce d'identité du déclarant\n• Acte de naissance du défunt (si disponible)\n• Pièce d'identité du défunt\n\n⏰ **Délai légal :** 48 heures maximum après le décès\n📍 **Lieu :** Centre d'état civil du lieu de décès\n👤 **Déclarants autorisés :** Famille, médecin, autorité locale\n\n💰 **Coût :** Gratuit (déclaration obligatoire)\n📄 **Délivrance :** Acte de décès officiel\n\n⚠️ **Obligatoire :** Aucune inhumation sans déclaration préalable`,
    suggestions: [
      'Décès à l\'étranger',
      'Documents pour succession',
      'Délai dépassé',
      'Inhumation administrative'
    ]
  };
}

function handleContactQuery(entities) {
  return {
    response: `📞 **Contacts Bureau National de l'État Civil (BUNEC)**\n\n🏢 **Siège principal - Yaoundé :**\n• 📱 Tél : +237 222 XX XX XX\n• 📧 Email : contact@bunec.cm\n• 📍 Adresse : [Adresse officielle BUNEC]\n\n🌐 **Services en ligne :**\n• Site web : www.etatcivil.cm\n• Portail FNI : portal.fni.cm\n• Plateforme citoyens : services.bunec.cm\n\n🕒 **Horaires d'ouverture :**\n• Lundi - Vendredi : 7h30 - 15h30\n• Samedi : 8h00 - 12h00\n\n🆘 **Urgences :** 8711 (numéro vert gratuit)\n\n📞 **Centres régionaux :**\n• Douala, Bafoussam, Garoua, Maroua, Bamenda...`,
    suggestions: [
      'Centres régionaux',
      'Prendre rendez-vous',
      'Horaires spéciaux',
      'Services d\'urgence'
    ]
  };
}

function handleGenealogyQuery(entities) {
  return {
    response: `🌳 **Recherche généalogique avec le FNI**\n\nLe Fichier National de l'Individu vous permet de :\n• **Retrouver** vos frères et sœurs\n• **Reconstituer** votre lignée familiale\n• **Vérifier** les liens de filiation\n• **Générer** des arbres généalogiques interactifs\n\n💡 **Pour une recherche efficace, donnez-moi :**\n• Nom et prénom(s) de la personne\n• Date de naissance (approximative)\n• Lieu de naissance\n• Noms des parents (si connus)\n\n🔍 **Exemple :** "Générer l'arbre de Jean KAMDEM né en 1985 à Yaoundé"`,
    suggestions: [
      'Rechercher ma famille',
      'Générer arbre généalogique',
      'Vérifier filiation',
      'Aide recherche avancée'
    ]
  };
}

async function handleStatisticsQuery(entities) {
  try {
    // Récupérer quelques statistiques de base
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN sexe = 'M' THEN 1 END) as males,
        COUNT(CASE WHEN sexe = 'F' THEN 1 END) as females,
        COUNT(CASE WHEN EXTRACT(YEAR FROM date_naiss) = EXTRACT(YEAR FROM CURRENT_DATE) THEN 1 END) as this_year
      FROM naissance
    `);
    
    const stats = statsResult.rows[0];
    const total = parseInt(stats.total);
    const males = parseInt(stats.males);
    const females = parseInt(stats.females);
    const thisYear = parseInt(stats.this_year);
    
    return {
      response: `📊 **Statistiques FNI - Résumé**\n\n👥 **Population enregistrée :**\n• **Total :** ${total.toLocaleString()} personnes\n• **Hommes :** ${males.toLocaleString()} (${((males/total)*100).toFixed(1)}%)\n• **Femmes :** ${females.toLocaleString()} (${((females/total)*100).toFixed(1)}%)\n\n📅 **Cette année :**\n• **Naissances :** ${thisYear.toLocaleString()} enregistrements\n\n🔍 Voulez-vous des analyses plus détaillées ?`,
      suggestions: [
        'Analyses démographiques',
        'Tendances par région',
        'Statistiques par année',
        'Répartition par âge'
      ],
      data: { stats: stats }
    };
  } catch (error) {
    return {
      response: `📊 **Statistiques FNI**\n\nLe système FNI contient des millions d'enregistrements d'état civil.\n\n📈 **Analyses disponibles :**\n• Répartition par sexe et âge\n• Tendances démographiques\n• Statistiques régionales\n• Évolution temporelle\n\nVoulez-vous une analyse spécifique ?`,
      suggestions: [
        'Démographie générale',
        'Tendances temporelles',
        'Analyses régionales',
        'Projections'
      ]
    };
  }
}

function handleGeneralQuery(message) {
  return {
    response: `👋 **Assistant virtuel BUNEC à votre service !**\n\n🎯 **Je peux vous aider avec :**\n• **Procédures d'état civil** (naissance, mariage, décès)\n• **Recherche dans le FNI** (retrouver famille, personnes)\n• **Informations pratiques** (documents, délais, coûts)\n• **Contacts et horaires** des centres d'état civil\n• **Génération d'arbres généalogiques**\n\n💬 **Exemples de questions :**\n• "Comment obtenir un acte de naissance ?"\n• "Rechercher Jean KAMDEM né en 1985"\n• "Documents pour se marier"\n• "Générer mon arbre généalogique"\n\n❓ **Comment puis-je vous aider aujourd'hui ?**`,
    suggestions: [
      'Procédure acte naissance',
      'Recherche dans le FNI',
      'Documents mariage',
      'Contact BUNEC',
      'Arbre généalogique',
      'Statistiques démographiques'
    ]
  };
}

module.exports = router;