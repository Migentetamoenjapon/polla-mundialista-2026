// ============================================================
// data.js — Datos del Mundial 2026
// Para actualizar equipos o puntuación, edita solo este archivo.
// ============================================================

const WC2026 = {

  // 12 grupos de 4 equipos (sorteo real, diciembre 2025)
  groups: {
    A: { teams: ["México",         "Corea del Sur",  "Sudáfrica",   "Chequia"] },
    B: { teams: ["Canadá",         "Suiza",          "Qatar",       "Bosnia-Herzegovina"] },
    C: { teams: ["Brasil",         "Marruecos",      "Escocia",     "Haití"] },
    D: { teams: ["EE. UU.",        "Paraguay",       "Australia",   "Turquía"] },
    E: { teams: ["Alemania",       "Ecuador",        "Costa de Marfil", "Curazao"] },
    F: { teams: ["Países Bajos",   "Japón",          "Túnez",       "Suecia"] },
    G: { teams: ["Bélgica",        "Irán",           "Egipto",      "Nueva Zelanda"] },
    H: { teams: ["España",         "Uruguay",        "Arabia Saudí","Cabo Verde"] },
    I: { teams: ["Francia",        "Senegal",        "Noruega",     "Iraq"] },
    J: { teams: ["Argentina",      "Austria",        "Argelia",     "Jordania"] },
    K: { teams: ["Portugal",       "Colombia",       "Uzbekistán",  "DR Congo"] },
    L: { teams: ["Inglaterra",     "Croacia",        "Panamá",      "Ghana"] },
  },

  // Códigos ISO 3166-1 alpha-2 para la librería flag-icons
  // Uso: <span class="fi fi-{code}"></span>
  // Referencia: https://github.com/lipis/flag-icons
  countryCodes: {
    "México":            "mx",
    "Corea del Sur":     "kr",
    "Sudáfrica":         "za",
    "Chequia":           "cz",
    "Canadá":            "ca",
    "Suiza":             "ch",
    "Qatar":             "qa",
    "Bosnia-Herzegovina":"ba",
    "Brasil":            "br",
    "Marruecos":         "ma",
    "Escocia":           "gb-sct",
    "Haití":             "ht",
    "EE. UU.":           "us",
    "Paraguay":          "py",
    "Australia":         "au",
    "Turquía":           "tr",
    "Alemania":          "de",
    "Ecuador":           "ec",
    "Costa de Marfil":   "ci",
    "Curazao":           "cw",
    "Países Bajos":      "nl",
    "Japón":             "jp",
    "Túnez":             "tn",
    "Suecia":            "se",
    "Bélgica":           "be",
    "Irán":              "ir",
    "Egipto":            "eg",
    "Nueva Zelanda":     "nz",
    "España":            "es",
    "Uruguay":           "uy",
    "Arabia Saudí":      "sa",
    "Cabo Verde":        "cv",
    "Francia":           "fr",
    "Senegal":           "sn",
    "Noruega":           "no",
    "Iraq":              "iq",
    "Argentina":         "ar",
    "Austria":           "at",
    "Argelia":           "dz",
    "Jordania":          "jo",
    "Portugal":          "pt",
    "Colombia":          "co",
    "Uzbekistán":        "uz",
    "DR Congo":          "cd",
    "Inglaterra":        "gb-eng",
    "Croacia":           "hr",
    "Panamá":            "pa",
    "Ghana":             "gh",
    "Playoff 1":         "un",
    // Equipos de mundiales pasados (no en el 2026)
    "Gales":              "gb-wls",
    "Polonia":            "pl",
    "Dinamarca":          "dk",
    "Costa Rica":         "cr",
    "Camerún":            "cm",
    "Serbia":             "rs",
    "Rusia":              "ru",
    "Nigeria":            "ng",
    "Islandia":           "is",
    "Perú":               "pe",
    "Chile":              "cl",
    "Grecia":             "gr",
    "Honduras":           "hn",
    "Italia":             "it",
  },

  // Panamá está en el Grupo L
  panamaGroup: "L",
  panamaMatches: [
    { key: "vsInglaterra", rival: "Inglaterra" },
    { key: "vsCroacia",    rival: "Croacia"    },
    { key: "vsGhana",      rival: "Ghana"      },
  ],

  // ============================================================
  // Partidos especiales — predicción de marcador exacto
  // ============================================================
  specialMatches: [
    { key: "mexico_sudafrica",   team1: "México",    team2: "Sudáfrica",  badge: "⚽ Partido Inaugural" },
    { key: "brasil_marruecos",   team1: "Brasil",    team2: "Marruecos"   },
    { key: "alemania_ecuador",   team1: "Alemania",  team2: "Ecuador"     },
    { key: "espana_uruguay",     team1: "España",    team2: "Uruguay"     },
    { key: "francia_noruega",    team1: "Francia",   team2: "Noruega"     },
    { key: "argentina_jordania", team1: "Argentina", team2: "Jordania"    },
    { key: "colombia_portugal",  team1: "Colombia",  team2: "Portugal"    },
    { key: "croacia_inglaterra", team1: "Croacia",   team2: "Inglaterra"  },
  ],

  // ============================================================
  // Bracket de eliminación directa (predeterminado por FIFA)
  // Tipos de slot:
  //   { group, pos }  → 1° o 2° de ese grupo
  //   { thirdPool }   → mejor 3° de los grupos indicados
  //   { prevMatch }   → ganador de una ronda anterior
  // ============================================================
  r32Bracket: [
    { matchId: "R32_73", label: "2° A vs 2° B",                    s1: { group:"A", pos:2 }, s2: { group:"B", pos:2 } },
    { matchId: "R32_74", label: "1° E vs Mejor 3° (A/B/C/D/F)",    s1: { group:"E", pos:1 }, s2: { thirdPool: ["A","B","C","D","F"] } },
    { matchId: "R32_75", label: "1° F vs 2° C",                    s1: { group:"F", pos:1 }, s2: { group:"C", pos:2 } },
    { matchId: "R32_76", label: "1° C vs 2° F",                    s1: { group:"C", pos:1 }, s2: { group:"F", pos:2 } },
    { matchId: "R32_77", label: "1° I vs Mejor 3° (C/D/F/G/H)",    s1: { group:"I", pos:1 }, s2: { thirdPool: ["C","D","F","G","H"] } },
    { matchId: "R32_78", label: "2° E vs 2° I",                    s1: { group:"E", pos:2 }, s2: { group:"I", pos:2 } },
    { matchId: "R32_79", label: "1° A vs Mejor 3° (C/E/F/H/I)",    s1: { group:"A", pos:1 }, s2: { thirdPool: ["C","E","F","H","I"] } },
    { matchId: "R32_80", label: "1° L vs Mejor 3° (E/H/I/J/K)",    s1: { group:"L", pos:1 }, s2: { thirdPool: ["E","H","I","J","K"] } },
    { matchId: "R32_81", label: "1° D vs Mejor 3° (B/E/F/I/J)",    s1: { group:"D", pos:1 }, s2: { thirdPool: ["B","E","F","I","J"] } },
    { matchId: "R32_82", label: "1° G vs Mejor 3° (A/E/H/I/J)",    s1: { group:"G", pos:1 }, s2: { thirdPool: ["A","E","H","I","J"] } },
    { matchId: "R32_83", label: "2° K vs 2° L",                    s1: { group:"K", pos:2 }, s2: { group:"L", pos:2 } },
    { matchId: "R32_84", label: "1° H vs 2° J",                    s1: { group:"H", pos:1 }, s2: { group:"J", pos:2 } },
    { matchId: "R32_85", label: "1° B vs Mejor 3° (E/F/G/I/J)",    s1: { group:"B", pos:1 }, s2: { thirdPool: ["E","F","G","I","J"] } },
    { matchId: "R32_86", label: "1° J vs 2° H",                    s1: { group:"J", pos:1 }, s2: { group:"H", pos:2 } },
    { matchId: "R32_87", label: "1° K vs Mejor 3° (D/E/I/J/L)",    s1: { group:"K", pos:1 }, s2: { thirdPool: ["D","E","I","J","L"] } },
    { matchId: "R32_88", label: "2° D vs 2° G",                    s1: { group:"D", pos:2 }, s2: { group:"G", pos:2 } },
  ],

  r16Bracket: [
    { matchId: "R16_89", label: "Octavos 1", prev1: "R32_74", prev2: "R32_77" },
    { matchId: "R16_90", label: "Octavos 2", prev1: "R32_73", prev2: "R32_75" },
    { matchId: "R16_91", label: "Octavos 3", prev1: "R32_76", prev2: "R32_78" },
    { matchId: "R16_92", label: "Octavos 4", prev1: "R32_79", prev2: "R32_80" },
    { matchId: "R16_93", label: "Octavos 5", prev1: "R32_83", prev2: "R32_84" },
    { matchId: "R16_94", label: "Octavos 6", prev1: "R32_81", prev2: "R32_82" },
    { matchId: "R16_95", label: "Octavos 7", prev1: "R32_86", prev2: "R32_88" },
    { matchId: "R16_96", label: "Octavos 8", prev1: "R32_85", prev2: "R32_87" },
  ],

  qfBracket: [
    { matchId: "QF_1", label: "Cuartos 1", prev1: "R16_89", prev2: "R16_90" },
    { matchId: "QF_2", label: "Cuartos 2", prev1: "R16_91", prev2: "R16_92" },
    { matchId: "QF_3", label: "Cuartos 3", prev1: "R16_93", prev2: "R16_94" },
    { matchId: "QF_4", label: "Cuartos 4", prev1: "R16_95", prev2: "R16_96" },
  ],

  sfBracket: [
    { matchId: "SF_1", label: "Semifinal 1", prev1: "QF_1", prev2: "QF_2" },
    { matchId: "SF_2", label: "Semifinal 2", prev1: "QF_3", prev2: "QF_4" },
  ],

  bronzeMatch: { matchId: "BRONZE", label: "Tercer lugar",    loser1: "SF_1", loser2: "SF_2" },
  finalMatch:  { matchId: "FINAL",  label: "Gran Final",      prev1:  "SF_1", prev2:  "SF_2" },

  // ============================================================
  // Sistema de puntos (modifica aquí para ajustar)
  // ============================================================
  scoring: {
    // Fase de grupos (3 pts solo si la posición es exacta)
    grupoPasa:            0,   // sin puntos por pasar en posición equivocada
    grupoPosicionCorrecta: 3,
    terceroPasa:          3,

    // Especiales
    campeon:    10,
    subcampeon:  3,
    goleador:    3,
    balonDeOro:  3,

    // Panamá y partidos destacados
    panamaResultado:  3,
    panamaExacto:     3,   // bonus adicional por marcador exacto
    specialResultado: 3,
    specialExacto:    3,

    // Extras (todos 3 pts)
    extra: 3,
  },

  // ============================================================
  // Jugadores de Panamá (primer goleador)
  // ============================================================
  panamaPlayers: [
    "Fajardo", "Waterman", "Góndola", "Ismael Díaz",
    "Bárcenas", "Andrade", "Carrasquilla", "Quintero",
    "Blackburn", "Davis", "Cummings", "Murillo",
  ],

  // ============================================================
  // Candidatos a Balón de Oro
  // ============================================================
  balonDeOroCandidates: [
    "Bellingham", "CR7", "Dembele", "Endrick", "Griezmann",
    "Haaland", "Kane", "Mbappe", "Pedri", "Vini",
    "Yamal", "Nuñez", "Valverde", "Rodrygo", "Osimhen",
    "Pulisic", "Arda Guler", "Joao Felix",
  ],

  // ============================================================
  // Candidatos a Goleador del Torneo / Bota de Oro
  // ============================================================
  goleadores: [
    "Arda Guler",
    "Bellingham",
    "Camavinga",
    "Carvajal",
    "Courtuois",
    "CR7",
    "Dembele",
    "Doue",
    "Embolo",
    "Endrick",
    "Fajardo",
    "Griezmann",
    "Haaland",
    "Havertz",
    "Huijsen",
    "Joao Felix",
    "Kane",
    "La Araña",
    "Mbappe",
    "Nuñez",
    "Osimhen",
    "Pedri",
    "Phoden",
    "Pulisic",
    "Rodrygo",
    "Rudiguer",
    "Valverde",
    "Vini",
    "Waterman",
    "Yamal",
    "Messi",
  ],

  // ============================================================
  // Contraseña de admin (cámbiala antes de distribuir)
  // ============================================================
  adminPassword: "panama2026",

  // ============================================================
  // Resultados reales — el admin llena esto cuando termine el torneo
  // Mientras sea null, la puntuación se muestra en ceros
  // ============================================================
  RESULTS: null,
  /*
  RESULTS: {
    grupos: {
      A: { primero: "México", segundo: "Corea del Sur" },
      // ... (un objeto por cada grupo A–L)
    },
    mejoresTerceros: ["Ecuador", "Francia", "..."],  // 8 equipos
    campeon:    "Argentina",
    subcampeon: "Francia",
    goleador:   "Messi",
    balonDeOro: "Messi",
    panama: {
      vsInglaterra: { golesPanama: 1, golesRival: 2 },
      vsCroacia:    { golesPanama: 0, golesRival: 0 },
      vsGhana:      { golesPanama: 2, golesRival: 1 },
    },
    specials: {
      mexico_sudafrica:   { golesTeam1: 1, golesTeam2: 0 },
      brasil_marruecos:   { golesTeam1: 3, golesTeam2: 0 },
      alemania_ecuador:   { golesTeam1: 2, golesTeam2: 0 },
      espana_uruguay:     { golesTeam1: 2, golesTeam2: 1 },
      francia_noruega:    { golesTeam1: 2, golesTeam2: 1 },
      argentina_jordania: { golesTeam1: 3, golesTeam2: 0 },
      colombia_portugal:  { golesTeam1: 0, golesTeam2: 2 },
      croacia_inglaterra: { golesTeam1: 1, golesTeam2: 2 },
    },
    extras: {
      primerGoleadorPanama: "Fajardo",
      golesYamal:           4,
      golesVinicius:        5,
      golesEnFinal:         3,
      penalesEnFinal:       "no",   // "si" | "no"
      masGolesCR7Messi:     "messi", // "cr7" | "messi" | "igual"
      equipoMasGoles:       "Francia",
      equipoMasGoleado:     "Arabia Saudí",
      mayorGoleada:         5,      // diferencia de goles del partido más abultado
    },
  }
  */

  // ============================================================
  // Historial — últimos 3 mundiales (grupos + bracket)
  // ============================================================
  historico: [
    {
      year: 2022, host: "Qatar",
      campeon: "Argentina", subcampeon: "Francia", tercero: "Croacia", cuarto: "Marruecos",
      groups: {
        A: ["Países Bajos", "Senegal",       "Ecuador",          "Qatar"],
        B: ["Inglaterra",   "EE. UU.",        "Irán",             "Gales"],
        C: ["Argentina",    "Polonia",         "México",           "Arabia Saudí"],
        D: ["Francia",      "Australia",       "Túnez",            "Dinamarca"],
        E: ["Japón",        "España",          "Alemania",         "Costa Rica"],
        F: ["Marruecos",    "Croacia",         "Bélgica",          "Canadá"],
        G: ["Brasil",       "Suiza",           "Camerún",          "Serbia"],
        H: ["Portugal",     "Corea del Sur",   "Uruguay",          "Ghana"],
      },
      bracket: {
        r16: [
          { home: "Países Bajos", score: "3–1",          away: "EE. UU.",       winner: "Países Bajos" },
          { home: "Argentina",    score: "2–1",          away: "Australia",     winner: "Argentina" },
          { home: "Francia",      score: "3–1",          away: "Polonia",       winner: "Francia" },
          { home: "Inglaterra",   score: "3–0",          away: "Senegal",       winner: "Inglaterra" },
          { home: "Croacia",      score: "1–1 (3–1p)",  away: "Japón",         winner: "Croacia" },
          { home: "Brasil",       score: "4–1",          away: "Corea del Sur", winner: "Brasil" },
          { home: "Marruecos",    score: "0–0 (3–0p)",  away: "España",        winner: "Marruecos" },
          { home: "Portugal",     score: "6–1",          away: "Suiza",         winner: "Portugal" },
        ],
        qf: [
          { home: "Croacia",    score: "1–1 (4–2p)",  away: "Brasil",       winner: "Croacia" },
          { home: "Argentina",  score: "2–2 (4–3p)",  away: "Países Bajos", winner: "Argentina" },
          { home: "Marruecos",  score: "1–0",          away: "Portugal",     winner: "Marruecos" },
          { home: "Francia",    score: "2–1",          away: "Inglaterra",   winner: "Francia" },
        ],
        sf: [
          { home: "Argentina", score: "3–0", away: "Croacia", winner: "Argentina" },
          { home: "Francia",   score: "2–0", away: "Marruecos", winner: "Francia" },
        ],
        tercero: { home: "Croacia",    score: "2–1",          away: "Marruecos", winner: "Croacia" },
        final:   { home: "Argentina",  score: "3–3 (4–2p)",  away: "Francia",   winner: "Argentina" },
      },
    },
    {
      year: 2018, host: "Rusia",
      campeon: "Francia", subcampeon: "Croacia", tercero: "Bélgica", cuarto: "Inglaterra",
      groups: {
        A: ["Uruguay",   "Rusia",      "Arabia Saudí",  "Egipto"],
        B: ["España",    "Portugal",   "Irán",          "Marruecos"],
        C: ["Francia",   "Dinamarca",  "Perú",          "Australia"],
        D: ["Croacia",   "Argentina",  "Nigeria",       "Islandia"],
        E: ["Brasil",    "Suiza",      "Serbia",        "Costa Rica"],
        F: ["Suecia",    "México",     "Corea del Sur", "Alemania"],
        G: ["Bélgica",   "Inglaterra", "Túnez",         "Panamá"],
        H: ["Colombia",  "Japón",      "Senegal",       "Polonia"],
      },
      bracket: {
        r16: [
          { home: "Francia",    score: "4–3",         away: "Argentina",  winner: "Francia" },
          { home: "Uruguay",    score: "2–1",         away: "Portugal",   winner: "Uruguay" },
          { home: "Rusia",      score: "1–1 (4–3p)", away: "España",     winner: "Rusia" },
          { home: "Croacia",    score: "1–1 (3–2p)", away: "Dinamarca",  winner: "Croacia" },
          { home: "Brasil",     score: "2–0",         away: "México",     winner: "Brasil" },
          { home: "Bélgica",    score: "3–2",         away: "Japón",      winner: "Bélgica" },
          { home: "Suecia",     score: "1–0",         away: "Suiza",      winner: "Suecia" },
          { home: "Inglaterra", score: "1–1 (4–3p)", away: "Colombia",   winner: "Inglaterra" },
        ],
        qf: [
          { home: "Francia",    score: "2–0", away: "Uruguay",    winner: "Francia" },
          { home: "Bélgica",    score: "2–1", away: "Brasil",     winner: "Bélgica" },
          { home: "Croacia",    score: "2–2 (4–3p)", away: "Rusia", winner: "Croacia" },
          { home: "Inglaterra", score: "2–0", away: "Suecia",     winner: "Inglaterra" },
        ],
        sf: [
          { home: "Francia",    score: "1–0", away: "Bélgica",    winner: "Francia" },
          { home: "Croacia",    score: "2–1", away: "Inglaterra", winner: "Croacia" },
        ],
        tercero: { home: "Bélgica",  score: "2–0", away: "Inglaterra", winner: "Bélgica" },
        final:   { home: "Francia",  score: "4–2", away: "Croacia",    winner: "Francia" },
      },
    },
    {
      year: 2014, host: "Brasil",
      campeon: "Alemania", subcampeon: "Argentina", tercero: "Países Bajos", cuarto: "Brasil",
      groups: {
        A: ["Brasil",       "México",     "Croacia",             "Camerún"],
        B: ["Países Bajos", "Chile",      "España",              "Australia"],
        C: ["Colombia",     "Grecia",     "Costa de Marfil",     "Japón"],
        D: ["Costa Rica",   "Uruguay",    "Italia",              "Inglaterra"],
        E: ["Francia",      "Suiza",      "Ecuador",             "Honduras"],
        F: ["Argentina",    "Nigeria",    "Bosnia-Herzegovina",  "Irán"],
        G: ["Alemania",     "EE. UU.",    "Portugal",            "Ghana"],
        H: ["Bélgica",      "Argelia",    "Rusia",               "Corea del Sur"],
      },
      bracket: {
        r16: [
          { home: "Brasil",        score: "1–1 (3–2p)",  away: "Chile",       winner: "Brasil" },
          { home: "Colombia",      score: "2–0",          away: "Uruguay",     winner: "Colombia" },
          { home: "Francia",       score: "2–0",          away: "Nigeria",     winner: "Francia" },
          { home: "Alemania",      score: "2–1",          away: "Argelia",     winner: "Alemania" },
          { home: "Argentina",     score: "1–0",          away: "Suiza",       winner: "Argentina" },
          { home: "Bélgica",       score: "2–1",          away: "EE. UU.",     winner: "Bélgica" },
          { home: "Países Bajos",  score: "2–1",          away: "México",      winner: "Países Bajos" },
          { home: "Costa Rica",    score: "1–1 (5–3p)",  away: "Grecia",      winner: "Costa Rica" },
        ],
        qf: [
          { home: "Alemania",      score: "1–0",          away: "Francia",      winner: "Alemania" },
          { home: "Brasil",        score: "2–1",          away: "Colombia",     winner: "Brasil" },
          { home: "Países Bajos",  score: "0–0 (4–3p)",  away: "Costa Rica",   winner: "Países Bajos" },
          { home: "Argentina",     score: "1–0",          away: "Bélgica",      winner: "Argentina" },
        ],
        sf: [
          { home: "Brasil",     score: "1–7", away: "Alemania",      winner: "Alemania" },
          { home: "Argentina",  score: "0–0 (4–2p)", away: "Países Bajos", winner: "Argentina" },
        ],
        tercero: { home: "Países Bajos", score: "3–0", away: "Brasil",     winner: "Países Bajos" },
        final:   { home: "Alemania",     score: "1–0", away: "Argentina", winner: "Alemania" },
      },
    },
  ],
};
