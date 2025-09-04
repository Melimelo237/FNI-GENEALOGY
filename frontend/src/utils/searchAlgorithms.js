// src/utils/searchAlgorithms.js - ALGORITHMES IA ET PHONÉTIQUE
class SearchAlgorithms {
  
  // 🔊 ALGORITHME SOUNDEX OPTIMISÉ POUR NOMS CAMEROUNAIS
  static cameroonianSoundex(name) {
    if (!name || typeof name !== 'string') return '0000';
    
    // Nettoyer le nom
    let cleanName = name.toUpperCase()
      .replace(/[^A-Z]/g, '') // Garder seulement lettres
      .replace(/^(NGU|NGA|NDI|NTO|TCH|KAM|FON)/g, 'N') // Préfixes camerounais
      .replace(/(DEM|TOU|KON|BOU)$/g, 'M'); // Suffixes camerounais
    
    if (cleanName.length === 0) return '0000';
    
    // Première lettre
    let soundex = cleanName[0];
    
    // Remplacements phonétiques
    const replacements = {
      'BFPV': '1',
      'CGJKQSXZ': '2',
      'DT': '3',
      'L': '4',
      'MN': '5',
      'R': '6'
    };
    
    let previousCode = this.getPhoneticCode(cleanName[0], replacements);
    
    for (let i = 1; i < cleanName.length; i++) {
      let currentCode = this.getPhoneticCode(cleanName[i], replacements);
      
      if (currentCode !== '0' && currentCode !== previousCode) {
        soundex += currentCode;
        if (soundex.length === 4) break;
      }
      
      previousCode = currentCode;
    }
    
    // Compléter avec des zéros
    return soundex.padEnd(4, '0');
  }
  
  static getPhoneticCode(char, replacements) {
    for (const [chars, code] of Object.entries(replacements)) {
      if (chars.includes(char)) return code;
    }
    return '0'; // Voyelles et autres
  }
  
  // 📏 DISTANCE DE LEVENSHTEIN OPTIMISÉE
  static levenshteinDistance(str1, str2) {
    if (!str1 || !str2) return Math.max(str1?.length || 0, str2?.length || 0);
    
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    // Initialisation
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    // Remplissage de la matrice
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // Insertion
          matrix[j - 1][i] + 1, // Suppression  
          matrix[j - 1][i - 1] + substitutionCost // Substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  // 🎯 SIMILARITÉ SÉMANTIQUE POUR NOMS CAMEROUNAIS
  static calculateSemanticSimilarity(name1, name2) {
    if (!name1 || !name2) return 0;
    
    const clean1 = name1.toLowerCase().trim();
    const clean2 = name2.toLowerCase().trim();
    
    // Correspondance exacte
    if (clean1 === clean2) return 100;
    
    // Similarité phonétique
    const soundex1 = this.cameroonianSoundex(clean1);
    const soundex2 = this.cameroonianSoundex(clean2);
    let phoneticScore = soundex1 === soundex2 ? 80 : 0;
    
    // Distance de Levenshtein normalisée
    const maxLength = Math.max(clean1.length, clean2.length);
    const distance = this.levenshteinDistance(clean1, clean2);
    const levenshteinScore = Math.max(0, (1 - distance / maxLength) * 100);
    
    // Correspondance de sous-chaînes communes
    const substringScore = this.calculateSubstringScore(clean1, clean2);
    
    // Bonus pour patterns camerounais
    const cameroonianBonus = this.getCameroonianPatternBonus(clean1, clean2);
    
    // Score final pondéré
    return Math.min(100, Math.round(
      (phoneticScore * 0.3) +
      (levenshteinScore * 0.4) +
      (substringScore * 0.2) +
      (cameroonianBonus * 0.1)
    ));
  }
  
  static calculateSubstringScore(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    let maxCommon = 0;
    
    // Trouver la plus longue sous-chaîne commune
    for (let i = 0; i < shorter.length; i++) {
      for (let j = i + 1; j <= shorter.length; j++) {
        const substring = shorter.slice(i, j);
        if (longer.includes(substring) && substring.length > maxCommon) {
          maxCommon = substring.length;
        }
      }
    }
    
    return (maxCommon / Math.max(str1.length, str2.length)) * 100;
  }
  
  static getCameroonianPatternBonus(name1, name2) {
    const cameroonianPatterns = [
      { pattern: /^(ndi|nga|fon|ngo|tcho|kam)/i, bonus: 10 },
      { pattern: /(dem|toh|kong|bou)$/i, bonus: 8 },
      { pattern: /(jean|marie|paul|pierre|joseph|emmanuel)/i, bonus: 5 }
    ];
    
    let bonus = 0;
    
    for (const { pattern, bonus: patternBonus } of cameroonianPatterns) {
      if (pattern.test(name1) && pattern.test(name2)) {
        bonus += patternBonus;
      }
    }
    
    return bonus;
  }
  
  // 🧠 ANALYSE CONTEXTUELLE INTELLIGENTE
  static analyzeSearchContext(searchTerm) {
    const context = {
      type: 'unknown',
      confidence: 0,
      extracted: {},
      suggestions: []
    };
    
    const term = searchTerm.toLowerCase().trim();
    
    // Détection d'un numéro d'acte
    const actNumberPattern = /^(act|acte)[-\s]*(\d+|[a-z]\d+)$/i;
    const actMatch = term.match(actNumberPattern);
    if (actMatch) {
      context.type = 'act_number';
      context.confidence = 95;
      context.extracted.actNumber = actMatch[2];
      return context;
    }
    
    // Détection d'une date
    const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})|(\d{4})/;
    const dateMatch = term.match(datePattern);
    if (dateMatch) {
      context.extracted.year = dateMatch[4] || dateMatch[3];
      if (dateMatch[1] && dateMatch[2]) {
        context.extracted.day = dateMatch[1];
        context.extracted.month = dateMatch[2];
      }
    }
    
    // Détection de lieu camerounais
    const cameroonianCities = [
      'yaoundé', 'douala', 'bafoussam', 'bamenda', 'garoua', 
      'maroua', 'ngaoundéré', 'bertoua', 'ebolowa', 'kribi',
      'limbe', 'kumba', 'tiko', 'buea', 'dschang', 'mbouda'
    ];
    
    for (const city of cameroonianCities) {
      if (term.includes(city)) {
        context.extracted.city = city;
        context.extracted.region = this.getCityRegion(city);
        break;
      }
    }
    
    // Détection de pattern de nom
    if (this.isLikelyPersonName(term)) {
      context.type = 'person_name';
      context.confidence = this.calculateNameConfidence(term);
      context.extracted.namePattern = this.analyzeNamePattern(term);
    }
    
    // Génération de suggestions
    context.suggestions = this.generateSearchSuggestions(context);
    
    return context;
  }
  
  static isLikelyPersonName(term) {
    // Au moins 2 mots ou patterns camerounais
    const words = term.split(/\s+/).filter(w => w.length > 1);
    if (words.length >= 2) return true;
    
    // Patterns camerounais
    const cameroonianPatterns = /^(ndi|nga|fon|ngo|tcho|kam|jean|marie|paul|pierre)/i;
    return cameroonianPatterns.test(term);
  }
  
  static calculateNameConfidence(term) {
    let confidence = 50; // Base
    
    const words = term.split(/\s+/).filter(w => w.length > 1);
    confidence += Math.min(30, words.length * 10); // Bonus mots multiples
    
    // Bonus patterns camerounais
    if (/^(ndi|nga|fon|ngo|tcho|kam)/i.test(term)) confidence += 20;
    if (/(dem|toh|kong|bou)$/i.test(term)) confidence += 15;
    if (/(jean|marie|paul|pierre|joseph|emmanuel)/i.test(term)) confidence += 10;
    
    return Math.min(95, confidence);
  }
  
  static analyzeNamePattern(term) {
    const words = term.split(/\s+/).filter(w => w.length > 1);
    
    return {
      wordCount: words.length,
      hasPrefix: /^(ndi|nga|fon|ngo|tcho|kam)/i.test(term),
      hasSuffix: /(dem|toh|kong|bou)$/i.test(term),
      hasCommonFirstName: /(jean|marie|paul|pierre|joseph|emmanuel)/i.test(term),
      estimatedStructure: words.length >= 2 ? 'firstname_lastname' : 'single_name'
    };
  }
  
  static getCityRegion(city) {
    const regionMap = {
      'yaoundé': 'Centre',
      'douala': 'Littoral', 'limbe': 'Sud-Ouest', 'kumba': 'Sud-Ouest',
      'bafoussam': 'Ouest', 'dschang': 'Ouest', 'mbouda': 'Ouest',
      'bamenda': 'Nord-Ouest',
      'garoua': 'Nord',
      'maroua': 'Extrême-Nord',
      'ngaoundéré': 'Adamaoua',
      'bertoua': 'Est',
      'ebolowa': 'Sud'
    };
    
    return regionMap[city.toLowerCase()] || 'Non identifiée';
  }
  
  static generateSearchSuggestions(context) {
    const suggestions = [];
    
    switch (context.type) {
      case 'person_name':
        suggestions.push('Essayer avec recherche phonétique');
        suggestions.push('Ajouter lieu de naissance');
        suggestions.push('Ajouter année de naissance');
        break;
        
      case 'act_number':
        suggestions.push('Vérifier le format du numéro');
        suggestions.push('Essayer sans préfixe "ACT"');
        break;
        
      default:
        if (context.extracted.city) {
          suggestions.push(`Rechercher tous les natifs de ${context.extracted.city}`);
        }
        if (context.extracted.year) {
          suggestions.push(`Rechercher les naissances de ${context.extracted.year}`);
        }
        suggestions.push('Utiliser la recherche intelligente');
    }
    
    return suggestions;
  }
  
  // 🎲 GÉNÉRATEUR DE REQUÊTES ALTERNATIVES INTELLIGENTES
  static generateAlternativeQueries(originalQuery, context) {
    const alternatives = [];
    const originalWords = originalQuery.toLowerCase().split(/\s+/);
    
    // Variations phonétiques
    if (context.type === 'person_name') {
      // Inversion prénom/nom
      if (originalWords.length === 2) {
        alternatives.push({
          query: `${originalWords[1]} ${originalWords[0]}`,
          type: 'name_inversion',
          confidence: 80
        });
      }
      
      // Variations avec initiales
      if (originalWords.length >= 2) {
        alternatives.push({
          query: `${originalWords[0]} ${originalWords[1][0]}`,
          type: 'initial_variation',
          confidence: 70
        });
      }
      
      // Recherche par nom de famille seul
      if (originalWords.length >= 2) {
        alternatives.push({
          query: originalWords[originalWords.length - 1],
          type: 'lastname_only',
          confidence: 60
        });
      }
    }
    
    // Ajout d'informations contextuelles
    if (context.extracted.year) {
      alternatives.push({
        query: `${originalQuery} ${context.extracted.year}`,
        type: 'with_year',
        confidence: 75
      });
    }
    
    if (context.extracted.city) {
      alternatives.push({
        query: `${originalQuery} ${context.extracted.city}`,
        type: 'with_location',
        confidence: 75
      });
    }
    
    return alternatives.sort((a, b) => b.confidence - a.confidence);
  }
  
  // 📊 SCORING MULTI-CRITÈRES POUR RÉSULTATS
  static calculateMultiCriteriaScore(person, searchTerm, searchContext) {
    const scores = {
      nameMatch: 0,
      contextMatch: 0,
      dataQuality: 0,
      familyCompleteness: 0,
      recency: 0
    };
    
    // Score de correspondance du nom (40% du score total)
    const nameScore = this.calculateSemanticSimilarity(searchTerm, person.fullName);
    scores.nameMatch = nameScore * 0.4;
    
    // Score de correspondance contextuelle (25%)
    if (searchContext.extracted.year && person.birthDate) {
      const personYear = new Date(person.birthDate).getFullYear();
      if (personYear.toString() === searchContext.extracted.year) {
        scores.contextMatch += 25;
      }
    }
    
    if (searchContext.extracted.city && person.birthPlace) {
      if (person.birthPlace.toLowerCase().includes(searchContext.extracted.city)) {
        scores.contextMatch += 25;
      }
    }
    scores.contextMatch *= 0.25;
    
    // Score de qualité des données (20%)
    let qualityScore = 0;
    if (person.birthDate && person.birthDate !== '0000-00-00') qualityScore += 25;
    if (person.birthPlace) qualityScore += 20;
    if (person.father) qualityScore += 25;
    if (person.mother) qualityScore += 25;
    if (person.actNumber) qualityScore += 5;
    scores.dataQuality = qualityScore * 0.2;
    
    // Score de complétude familiale (10%)
    if (person.father && person.mother) {
      scores.familyCompleteness = 10;
    } else if (person.father || person.mother) {
      scores.familyCompleteness = 5;
    }
    scores.familyCompleteness *= 0.1;
    
    // Score de récence des données (5%)
    if (person.lastUpdated) {
      const daysSinceUpdate = (Date.now() - new Date(person.lastUpdated)) / (1000 * 60 * 60 * 24);
      scores.recency = Math.max(0, (365 - daysSinceUpdate) / 365 * 5) * 0.05;
    }
    
    const totalScore = Math.round(
      scores.nameMatch + 
      scores.contextMatch + 
      scores.dataQuality + 
      scores.familyCompleteness + 
      scores.recency
    );
    
    return {
      totalScore: Math.min(100, totalScore),
      breakdown: scores,
      highlights: this.generateScoreHighlights(scores, person, searchTerm)
    };
  }
  
  static generateScoreHighlights(scores, person, searchTerm) {
    const highlights = [];
    
    if (scores.nameMatch > 30) highlights.push('Forte correspondance du nom');
    if (scores.contextMatch > 15) highlights.push('Contexte correspondant');
    if (scores.dataQuality > 15) highlights.push('Données complètes');
    if (scores.familyCompleteness >= 5) highlights.push('Filiation renseignée');
    if (scores.recency > 2) highlights.push('Données récentes');
    
    return highlights;
  }
  
  // 🔮 PRÉDICTIONS ET SUGGESTIONS INTELLIGENTES
  static generateSmartSuggestions(searchHistory, currentQuery) {
    const suggestions = [];
    
    // Analyse des patterns de recherche précédents
    const queryPatterns = this.analyzeQueryPatterns(searchHistory);
    
    // Suggestions basées sur l'historique
    if (queryPatterns.commonLocations.length > 0) {
      suggestions.push({
        type: 'location_suggestion',
        text: `${currentQuery} ${queryPatterns.commonLocations[0]}`,
        reason: 'Basé sur vos recherches précédentes'
      });
    }
    
    if (queryPatterns.commonYears.length > 0) {
      suggestions.push({
        type: 'year_suggestion', 
        text: `${currentQuery} ${queryPatterns.commonYears[0]}`,
        reason: 'Année fréquemment recherchée'
      });
    }
    
    // Suggestions phonétiques
    if (currentQuery.length >= 3) {
      const phoneticVariations = this.generatePhoneticVariations(currentQuery);
      phoneticVariations.forEach(variation => {
        suggestions.push({
          type: 'phonetic_suggestion',
          text: variation,
          reason: 'Variation phonétique'
        });
      });
    }
    
    return suggestions.slice(0, 8); // Limiter à 8 suggestions
  }
  
  static analyzeQueryPatterns(searchHistory) {
    const locations = [];
    const years = [];
    
    searchHistory.forEach(query => {
      // Extraire lieux et années des requêtes précédentes
      const yearMatch = query.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) years.push(yearMatch[0]);
      
      // Logique simplifiée pour les lieux
      const cameroonianCities = ['yaoundé', 'douala', 'bafoussam', 'bamenda'];
      cameroonianCities.forEach(city => {
        if (query.toLowerCase().includes(city)) {
          locations.push(city);
        }
      });
    });
    
    // Retourner les plus fréquents
    return {
      commonLocations: [...new Set(locations)].slice(0, 3),
      commonYears: [...new Set(years)].slice(0, 3)
    };
  }
  
  static generatePhoneticVariations(query) {
    const variations = [];
    
    // Remplacements phonétiques courants
    const phoneticReplacements = [
      ['ch', 'tch'], ['tch', 'ch'],
      ['c', 'k'], ['k', 'c'],
      ['ph', 'f'], ['f', 'ph'],
      ['ou', 'u'], ['u', 'ou'],
      ['ai', 'è'], ['è', 'ai']
    ];
    
    phoneticReplacements.forEach(([from, to]) => {
      if (query.includes(from)) {
        variations.push(query.replace(new RegExp(from, 'gi'), to));
      }
    });
    
    return [...new Set(variations)].slice(0, 3);
  }
}

module.exports = SearchAlgorithms;