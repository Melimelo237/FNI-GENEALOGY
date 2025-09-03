// ====================================
// backend/src/services/ChatbotService.js
const pool = require('../../db');

class ChatbotService {
  static async processMessage(message, context = {}) {
    const lowerMessage = message.toLowerCase();
    
    // Classification de l'intention
    const intent = this.classifyIntent(lowerMessage);
    
    try {
      switch (intent) {
        case 'naissance':
          return await this.handleBirthInquiry(lowerMessage, context);
        case 'mariage':
          return await this.handleMarriageInquiry(lowerMessage, context);
        case 'deces':
          return await this.handleDeathInquiry(lowerMessage, context);
        case 'recherche':
          return await this.handleSearchInquiry(lowerMessage, context);
        case 'contact':
          return this.handleContactInquiry();
        case 'procedure':
          return this.handleProcedureInquiry(lowerMessage);
        default:
          return this.handleGeneralInquiry(lowerMessage);
      }
    } catch (error) {
      console.error('Message processing error:', error);
      return {
        response: "Je rencontre une difficulté pour traiter votre demande. Pouvez-vous être plus précis ?",
        suggestions: ["Procédure acte de naissance", "Contact BUNEC", "Recherche dans le FNI"]
      };
    }
  }

  static classifyIntent(message) {
    const keywords = {
      naissance: ['naissance', 'né', 'bébé', 'enfant', 'accouchement', 'nouveau-né', 'acte de naissance'],
      mariage: ['mariage', 'marier', 'époux', 'épouse', 'union', 'conjoint', 'célébration'],
      deces: ['décès', 'mort', 'décédé', 'enterrement', 'funérailles', 'acte de décès'],
      recherche: ['recherche', 'retrouver', 'famille', 'fni', 'base', 'données', 'consulter'],
      contact: ['contact', 'téléphone', 'adresse', 'bureau', 'horaire', 'rendez-vous'],
      procedure: ['procédure', 'comment', 'étapes', 'documents', 'requis', 'nécessaire']
    };

    for (const [intent, words] of Object.entries(keywords)) {
      if (words.some(word => message.includes(word))) {
        return intent;
      }
    }
    return 'general';
  }

  static async handleBirthInquiry(message, context) {
    const response = `🍼 **Procédure d'acte de naissance au Cameroun**

📋 **Documents nécessaires :**
• Certificat médical d'accouchement
• Pièces d'identité des parents
• Certificat de mariage des parents (si applicable)
• Déclaration sur l'honneur (si hors délai)

⏰ **Délai :** 45 jours maximum après la naissance
💰 **Coût :** 
• Gratuit dans les 45 jours
• 1 500 FCFA après 45 jours

📍 **Lieu :** Centre d'état civil de la commune de naissance

Avez-vous besoin d'informations spécifiques sur une étape ?`;

    const suggestions = [
      "Où déposer le dossier ?",
      "Que faire après 45 jours ?",
      "Documents pour parents étrangers",
      "Acte de naissance par jugement"
    ];

    return { response, suggestions };
  }

  static async handleMarriageInquiry(message, context) {
    const response = `💒 **Procédure de mariage civil au Cameroun**

📋 **Documents requis pour chaque époux :**
• Acte de naissance (moins de 6 mois)
• Certificat médical (moins de 3 mois)
• Certificat de célibat
• 4 photos d'identité
• Pièce d'identité valide

👥 **Témoins :** 4 témoins majeurs (2 par époux) avec pièces d'identité

⏳ **Étapes :**
1. Dépôt du dossier à la mairie
2. Publication des bans (10 jours)
3. Célébration par l'officier d'état civil

💰 **Coût total :** 15 000 à 25 000 FCFA
⏰ **Délai :** Minimum 15 jours après dépôt

Quelle information précise recherchez-vous ?`;

    const suggestions = [
      "Certificat de célibat",
      "Mariage avec un étranger",
      "Régime matrimonial", 
      "Publication des bans"
    ];

    return { response, suggestions };
  }

  static async handleDeathInquiry(message, context) {
    const response = `⚱️ **Déclaration de décès au Cameroun**

📋 **Documents requis :**
• Certificat médical de décès
• Pièce d'identité du déclarant
• Acte de naissance du défunt (si possible)
• Pièce d'identité du défunt

⏰ **Délai légal :** 48h maximum après le décès
📍 **Lieu :** Centre d'état civil du lieu de décès
👤 **Qui peut déclarer :** Famille, médecin, autorité locale

💰 **Coût :** Gratuit (déclaration obligatoire)
📄 **Résultat :** Acte de décès officiel

⚠️ **Important :** La déclaration est obligatoire avant toute inhumation.

Avez-vous une situation particulière ?`;

    const suggestions = [
      "Décès à l'étranger",
      "Documents pour succession",
      "Délai dépassé",
      "Décès sans témoins"
    ];

    return { response, suggestions };
  }

  static async handleSearchInquiry(message, context) {
    // Recherche simple dans la base si des mots-clés sont fournis
    if (message.includes('nom') || message.includes('rechercher')) {
      return this.performBasicSearch(message);
    }

    const response = `🔍 **Recherche dans le Fichier National de l'Individu (FNI)**

Le FNI vous permet de :
• Retrouver vos frères et sœurs
• Vérifier votre filiation
• Obtenir des duplicatas d'actes
• Consulter votre historique d'état civil

📝 **Pour effectuer une recherche, j'ai besoin de :**
• Nom et prénom(s)
• Date de naissance (approximative)
• Lieu de naissance

💡 **Exemple :** "Rechercher Jean KAMDEM né en 1985 à Yaoundé"

Donnez-moi les informations de la personne recherchée :`;

    const suggestions = [
      "Rechercher ma famille",
      "Duplic 'acte perdu",
      "Vérifier mes informations",
      "Historique état civil"
    ];

    return { response, suggestions };
  }

  static async performBasicSearch(message) {
    try {
      // Extraction basique des informations de recherche
      const nameMatch = message.match(/(?:nom|appelé|nommé|rechercher)\s+([a-zA-ZÀ-ÿ\s]+?)(?:\s|$)/i);
      const name = nameMatch ? nameMatch[1].trim() : null;

      if (!name || name.length < 3) {
        return {
          response: "Pour effectuer une recherche, donnez-moi au moins le nom complet de la personne.",
          suggestions: ["Jean KAMDEM", "Marie NGONO", "Pierre MBARGA"]
        };
      }

      const searchResult = await pool.query(`
        SELECT 
          id,
          noms_enfant || ' ' || COALESCE(prenoms_enfant, '') as full_name,
          date_naiss,
          lieu_naiss,
          sexe,
          noms_pere,
          noms_mere
        FROM naissance 
        WHERE LOWER(noms_enfant) LIKE LOWER($1)
           OR LOWER(prenoms_enfant) LIKE LOWER($1)
        LIMIT 5
      `, [`%${name}%`]);

      if (searchResult.rows.length === 0) {
        return {
          response: `❌ Aucune personne trouvée avec le nom "${name}" dans la base FNI.

💡 **Suggestions :**
• Vérifiez l'orthographe
• Essayez avec moins de mots
• Utilisez les noms de famille des parents`,
          suggestions: ["Nouvelle recherche", "Contact BUNEC", "Recherche par parents"]
        };
      }

      let response = `✅ **${searchResult.rows.length} résultat(s) trouvé(s) pour "${name}" :**\n\n`;
      
      searchResult.rows.forEach((person, index) => {
        const birthDate = person.date_naiss ? new Date(person.date_naiss).toLocaleDateString('fr-FR') : 'Non renseignée';
        response += `${index + 1}. **${person.full_name}**
   • Né(e) le : ${birthDate}
   • Lieu : ${person.lieu_naiss || 'Non renseigné'}
   • Sexe : ${person.sexe === 'M' ? 'Masculin' : 'Féminin'}
   • Parents : ${person.noms_pere || 'Non renseigné'} / ${person.noms_mere || 'Non renseigné'}
   
`;
      });

      response += `\nVoulez-vous plus de détails sur l'une de ces personnes ?`;

      return {
        response,
        suggestions: [
          "Voir arbre généalogique",
          "Nouvelle recherche",
          "Dupliquer un acte"
        ]
      };

    } catch (error) {
      console.error('Search error:', error);
      return {
        response: "Erreur lors de la recherche. Veuillez réessayer ou contacter le support.",
        suggestions: ["Réessayer", "Contact BUNEC"]
      };
    }
  }

  static handleContactInquiry() {
    const response = `📞 **Contacts Bureau National de l'État Civil (BUNEC)**

🏢 **Siège principal - Yaoundé :**
• 📱 Tél : +237 222 XX XX XX
• 📧 Email : contact@bunec.cm
• 📍 Adresse : [Adresse officielle]

🌐 **Services en ligne :**
• Site web : www.etatcivil.cm
• Portail FNI : portal.fni.cm

🕒 **Horaires d'ouverture :**
• Lundi - Vendredi : 7h30 - 15h30
• Samedi : 8h00 - 12h00

🆘 **Urgences :** 8711 (numéro vert gratuit)

📞 **Centres régionaux :**
• Douala, Bafoussam, Garoua, Maroua, Bamenda...

Quelle région vous intéresse ?`;

    const suggestions = [
      "Centres régionaux",
      "Prendre rendez-vous", 
      "Horaires spéciaux",
      "Services en ligne"
    ];

    return { response, suggestions };
  }

  static handleProcedureInquiry(message) {
    const response = `📚 **Principales procédures d'état civil**

🍼 **Naissance :** Déclaration sous 45 jours, gratuite
💒 **Mariage :** Dossier complet + publication des bans
⚱️ **Décès :** Déclaration sous 48h obligatoire
📄 **Duplicata :** Demande avec justificatifs

⚡ **Services rapides :**
• Recherche FNI en ligne
• Vérification d'actes  
• Suivi de dossiers

🤖 **Je peux vous guider pour :**
• Lister les documents requis
• Expliquer les étapes détaillées
• Calculer les coûts
• Trouver les centres compétents

Sur quelle procédure avez-vous besoin d'aide ?`;

    const suggestions = [
      "Acte de naissance",
      "Mariage civil", 
      "Déclaration décès",
      "Duplicata d'acte"
    ];

    return { response, suggestions };
  }

  static handleGeneralInquiry(message) {
    const response = `👋 Je suis l'assistant virtuel du Bureau National de l'État Civil (BUNEC).

🎯 **Je peux vous aider avec :**
• Les procédures d'état civil (naissance, mariage, décès)
• La recherche dans le Fichier National de l'Individu (FNI)  
• Les documents requis et démarches
• Les contacts des centres d'état civil
• Les tarifs et délais officiels

💬 **Exemples de questions :**
• "Comment obtenir un acte de naissance ?"
• "Rechercher Jean KAMDEM né en 1985"
• "Documents pour se marier"
• "Déclarer un décès"

Comment puis-je vous aider aujourd'hui ?`;

    const suggestions = [
      "Procédure acte de naissance",
      "Recherche dans le FNI",
      "Documents pour mariage", 
      "Contact BUNEC"
    ];

    return { response, suggestions };
  }

  static getSuggestions(category) {
    const suggestionsByCategory = {
      general: [
        "Comment obtenir un acte de naissance ?",
        "Rechercher une personne dans le FNI",
        "Documents pour se marier",
        "Déclarer un décès"
      ],
      naissance: [
        "Délais pour déclarer une naissance",
        "Documents pour parents étrangers",
        "Procédure hors délai",
        "Acte de naissance par jugement"
      ],
      mariage: [
        "Régime matrimonial",
        "Mariage avec un étranger", 
        "Publication des bans",
        "Certificat de célibat"
      ],
      deces: [
        "Décès à l'étranger",
        "Documents pour succession",
        "Inhumation administrative",
        "Délai dépassé"
      ]
    };

    return suggestionsByCategory[category] || suggestionsByCategory.general;
  }
}

module.exports = ChatbotService;