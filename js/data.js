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
  },

  // Panamá está en el Grupo L
  panamaGroup: "L",
  panamaMatches: [
    { key: "vsInglaterra", rival: "Inglaterra" },
    { key: "vsCroacia",    rival: "Croacia"    },
    { key: "vsGhana",      rival: "Ghana"      },
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
    // Fase de grupos
    grupoPasa:            2,  // equipo pasa a 32avos (posición incorrecta)
    grupoPosicionCorrecta: 3, // bonus por posición exacta (1° o 2°)
    terceroPasa:          4,  // acertaste que ese 3° avanzaría

    // Eliminación directa
    r32:    2,
    r16:    4,
    qf:     6,
    sf:     8,
    bronze: 7,
    final:  12,

    // Especiales
    campeon:    20,
    subcampeon: 12,
    goleador:   15,

    // Sección Panamá
    panamaResultado: 5,   // resultado correcto (G/E/P)
    panamaExacto:   12,   // marcador exacto
  },

  // ============================================================
  // Candidatos a Goleador del Torneo (orden alfabético)
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
    "Yo no me llamo Messi",
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
      // ...
    },
    mejoresTerceros: ["Ecuador", "Francia", ...],
    knockout: {
      R32_73: "México",
      // ...
    },
    campeon: "Argentina",
    subcampeon: "Francia",
    goleador: "Messi",
    panama: {
      vsInglaterra: { golesPanama: 1, golesRival: 2 },
      vsCroacia:    { golesPanama: 0, golesRival: 0 },
      vsGhana:      { golesPanama: 2, golesRival: 1 },
    }
  }
  */
};
