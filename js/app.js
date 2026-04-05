// ============================================================
// app.js — Polla Mundialista 2026
// ============================================================

const App = (function () {

  // ─── Constantes ──────────────────────────────────────────
  const LS_DRAFT  = 'polla2026_draft';
  const LS_LOCKED = 'polla2026_locked';

  // Total de campos requeridos para 100%:
  // nombre(1) + grupos(12×2=24) + terceros_completo(1) + knockout(32) + panama(6) + goleador(1) + campeon(1) + subcampeon(1)
  const TOTAL_FIELDS = 67;

  // ─── Estado ──────────────────────────────────────────────
  let state = {
    nombre: '',
    locked: false,
    predicciones: {
      grupos: {},          // { A: { primero:'', segundo:'' }, ... }
      mejoresTerceros: [], // array de 8 nombres
      knockout: {},        // { 'R32_73': 'equipo', ... }
      campeon:    '',
      subcampeon: '',
      goleador:   '',
      panama: {
        vsInglaterra: { golesPanama: '', golesRival: '' },
        vsCroacia:    { golesPanama: '', golesRival: '' },
        vsGhana:      { golesPanama: '', golesRival: '' },
      }
    }
  };

  // ─── Debounce para guardar ────────────────────────────────
  let saveTimer = null;
  function debounceSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveToStorage, 300);
  }

  // ─── Helpers ─────────────────────────────────────────────
  function allTeams() {
    return Object.values(WC2026.groups).flatMap(g => g.teams);
  }

  // Devuelve el código ISO del país (para flag-icons)
  function countryCode(teamName) {
    return WC2026.countryCodes[teamName] || 'un';
  }

  // <span class="fi fi-mx"></span> — bandera real como SVG
  function flagSpan(teamName, size = '') {
    const code = countryCode(teamName);
    return `<span class="fi fi-${code}${size ? ' fi-' + size : ''}"></span>`;
  }

  function getGroupPick(group, pos) {
    // pos: 1 → primero, 2 → segundo
    const g = state.predicciones.grupos[group];
    if (!g) return null;
    return pos === 1 ? g.primero : g.segundo;
  }

  // Devuelve los 2 equipos para un match del bracket
  function getTeamsForMatch(matchId) {
    // Buscar en r32Bracket
    const r32 = WC2026.r32Bracket.find(m => m.matchId === matchId);
    if (r32) {
      return [resolveSlot(r32.s1), resolveSlot(r32.s2)];
    }
    // Buscar en fases siguientes por prev1/prev2
    const allRounds = [
      ...WC2026.r16Bracket,
      ...WC2026.qfBracket,
      ...WC2026.sfBracket,
    ];
    const match = allRounds.find(m => m.matchId === matchId);
    if (match) {
      return [
        state.predicciones.knockout[match.prev1] || null,
        state.predicciones.knockout[match.prev2] || null,
      ];
    }
    // Final y bronce
    if (matchId === 'FINAL') {
      return [
        state.predicciones.knockout[WC2026.finalMatch.prev1] || null,
        state.predicciones.knockout[WC2026.finalMatch.prev2] || null,
      ];
    }
    if (matchId === 'BRONZE') {
      // Perdedores de semifinales: no guardamos perdedores explícitamente
      // Para bronce, las opciones son los 4 semifinalistas menos los ganadores de SF
      const sf1All = getTeamsForMatch('SF_1').filter(Boolean);
      const sf2All = getTeamsForMatch('SF_2').filter(Boolean);
      const sf1Win = state.predicciones.knockout['SF_1'];
      const sf2Win = state.predicciones.knockout['SF_2'];
      const t1 = sf1All.find(t => t !== sf1Win) || null;
      const t2 = sf2All.find(t => t !== sf2Win) || null;
      return [t1, t2];
    }
    return [null, null];
  }

  function resolveSlot(slot) {
    if (slot.group && slot.pos) {
      return getGroupPick(slot.group, slot.pos);
    }
    if (slot.thirdPool) {
      // Candidatos: mejoresTerceros que pertenecen a algún grupo del pool
      const pool = slot.thirdPool;
      const terceros = state.predicciones.mejoresTerceros;
      // Filtrar los terceros cuyos grupos están en el pool
      const candidates = terceros.filter(team => {
        for (const grpId of pool) {
          const grpTeams = WC2026.groups[grpId].teams;
          // ¿Está en el grupo y NO es el 1° o 2° seleccionado?
          const picks = state.predicciones.grupos[grpId];
          if (grpTeams.includes(team)) {
            if (!picks || (team !== picks.primero && team !== picks.segundo)) {
              return true;
            }
          }
        }
        return false;
      });
      // Si hay solo una opción, devolvemos null para que el select tenga opciones
      return null; // siempre null: el usuario elige de su lista de terceros
    }
    return null;
  }

  // Opciones disponibles para el dropdown de un match
  function getOptionsForMatch(matchId) {
    // Para R32 con thirdPool, mostrar los mejoresTerceros del pool
    const r32 = WC2026.r32Bracket.find(m => m.matchId === matchId);
    if (r32 && r32.s2 && r32.s2.thirdPool) {
      const t1 = resolveFromGroup(r32.s1);
      const pool = r32.s2.thirdPool;
      const terceros = state.predicciones.mejoresTerceros;
      const candidates = terceros.filter(team => {
        for (const grpId of pool) {
          const grpTeams = WC2026.groups[grpId].teams;
          if (grpTeams.includes(team)) {
            const picks = state.predicciones.grupos[grpId];
            if (!picks || (team !== picks.primero && team !== picks.segundo)) return true;
          }
        }
        return false;
      });
      // Si no hay candidatos del pool, mostrar todos los terceros
      const opts = candidates.length > 0 ? candidates : terceros;
      return { t1: t1, t2Options: opts.length > 0 ? opts : null };
    }
    // Match normal: 2 equipos determinados
    const [t1, t2] = getTeamsForMatch(matchId);
    return { t1, t2, t2Options: null };
  }

  function resolveFromGroup(slot) {
    if (slot && slot.group && slot.pos) return getGroupPick(slot.group, slot.pos);
    return null;
  }

  // ─── Invalidar picks downstream ──────────────────────────
  function getAllDownstreamMatchIds(matchId) {
    const result = new Set();
    function walk(mid) {
      const allRounds = [
        ...WC2026.r16Bracket,
        ...WC2026.qfBracket,
        ...WC2026.sfBracket,
        WC2026.finalMatch,
      ];
      for (const m of allRounds) {
        if (m.prev1 === mid || m.prev2 === mid) {
          if (!result.has(m.matchId)) {
            result.add(m.matchId);
            walk(m.matchId);
          }
        }
      }
      // Check BRONZE (depende de ganadores SF)
      if (mid === 'SF_1' || mid === 'SF_2') {
        result.add('BRONZE');
      }
    }
    walk(matchId);
    return result;
  }

  function invalidateDownstream(matchId) {
    const downstream = getAllDownstreamMatchIds(matchId);
    for (const mid of downstream) {
      state.predicciones.knockout[mid] = '';
    }
  }

  // Cuando cambia un grupo, invalidar todos los R32 que dependen de él
  function invalidateGroupDownstream(groupId) {
    const affected = WC2026.r32Bracket.filter(m => {
      return (m.s1.group === groupId) || (m.s2.group === groupId);
    });
    for (const match of affected) {
      if (state.predicciones.knockout[match.matchId]) {
        state.predicciones.knockout[match.matchId] = '';
        invalidateDownstream(match.matchId);
      }
    }
  }

  // ─── Render grupos ────────────────────────────────────────
  function renderGroupCards() {
    const container = document.getElementById('groups-grid-all');
    if (!container) return;
    container.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'groups-grid';

    Object.keys(WC2026.groups).forEach(grpId => {
      grid.appendChild(buildGroupCard(grpId));
    });

    container.appendChild(grid);
  }

  function buildGroupCard(grpId) {
    const grp = WC2026.groups[grpId];
    const picks = state.predicciones.grupos[grpId] || { primero: '', segundo: '' };
    const complete = picks.primero && picks.segundo;

    const card = document.createElement('div');
    card.className = 'group-card' + (complete ? ' complete' : '');
    card.id = `group-card-${grpId}`;
    card.dataset.group = grpId;

    const chipsHtml = grp.teams.map(t => {
      const pos = picks.primero === t ? 1 : picks.segundo === t ? 2 : 0;
      return `<button class="team-chip${pos === 1 ? ' pos-1' : pos === 2 ? ' pos-2' : ''}"
        data-team-pick="${grpId}" data-team="${t}" type="button">
        <span class="chip-badge">${pos > 0 ? pos + '°' : ''}</span>
        <span class="chip-flag">${flagSpan(t)}</span>
        <span class="chip-name">${t}</span>
      </button>`;
    }).join('');

    // Hint dinámico
    const hint = !picks.primero
      ? 'Toca el 1° lugar'
      : !picks.segundo
        ? 'Ahora el 2° lugar'
        : `🥇 ${picks.primero} · 🥈 ${picks.segundo}`;

    card.innerHTML = `
      <div class="group-card-header">
        <span>Grupo ${grpId}</span>
        <span class="check">${complete ? '✓' : ''}</span>
      </div>
      <div class="team-chips">${chipsHtml}</div>
      <div class="group-hint">${hint}</div>
    `;
    return card;
  }

  function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(p => {
      p.classList.toggle('active', p.id === tabId);
    });
  }

  // Actualizar tarjeta de grupo (sin re-renderizar todo)
  function refreshGroupCard(grpId) {
    const container = document.getElementById(`group-card-${grpId}`);
    if (!container) return;
    const newCard = buildGroupCard(grpId);
    container.replaceWith(newCard);
  }

  // ─── Render Mejores Terceros ──────────────────────────────
  function renderTerceros() {
    const container = document.getElementById('terceros-container');
    if (!container) return;

    // Construir lista de candidatos: todos los equipos que NO están como 1° o 2°
    const pickedAs12 = new Set();
    Object.values(state.predicciones.grupos).forEach(g => {
      if (g.primero) pickedAs12.add(g.primero);
      if (g.segundo) pickedAs12.add(g.segundo);
    });

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'terceros-grid';

    Object.entries(WC2026.groups).forEach(([grpId, grp]) => {
      grp.teams.forEach(team => {
        const isSelected = state.predicciones.mejoresTerceros.includes(team);
        const isTop2 = pickedAs12.has(team);

        const item = document.createElement('label');
        item.className = 'tercero-item' + (isSelected ? ' selected' : '') + (isTop2 ? ' dimmed' : '');
        item.innerHTML = `
          <input type="checkbox" data-team="${team}" ${isSelected ? 'checked' : ''}>
          <span class="t-group">${grpId}</span>
          <span class="t-flag">${flagSpan(team)}</span>
          <span>${team}</span>
          ${isSelected ? '<span style="margin-left:auto;color:var(--rojo);font-weight:800">✓</span>' : ''}
        `;
        item.addEventListener('click', (e) => {
          e.preventDefault();
          toggleTercero(team);
        });
        grid.appendChild(item);
      });
    });

    container.appendChild(grid);
    updateTercerosCounter();
  }

  function toggleTercero(team) {
    if (state.locked) return;
    const arr = state.predicciones.mejoresTerceros;
    const idx = arr.indexOf(team);
    if (idx >= 0) {
      arr.splice(idx, 1);
    } else {
      if (arr.length >= 8) {
        showToast('Ya seleccionaste 8 terceros. Desmarca uno primero.', 'warning');
        return;
      }
      arr.push(team);
    }
    renderTerceros();
    // Invalidar knockouts que dependen de terceros
    refreshKnockoutDropdowns();
    debounceSave();
    updateProgress();
  }

  function updateTercerosCounter() {
    const count = state.predicciones.mejoresTerceros.length;
    const el = document.getElementById('terceros-count');
    if (!el) return;
    el.textContent = `${count}/8`;
    el.className = 'terceros-counter' + (count === 8 ? ' complete' : count > 8 ? ' over' : '');
  }

  // ─── Render knockout ──────────────────────────────────────
  function renderKnockoutRounds() {
    const container = document.getElementById('knockout-container');
    if (!container) return;
    container.innerHTML = '';

    const rounds = [
      { title: 'Ronda de 32', badge: 'R32', matches: WC2026.r32Bracket },
      { title: 'Octavos de Final', badge: 'R16', matches: WC2026.r16Bracket },
      { title: 'Cuartos de Final', badge: 'QF', matches: WC2026.qfBracket },
      { title: 'Semifinales', badge: 'SF', matches: WC2026.sfBracket },
      { title: 'Tercer Lugar y Final', badge: '', matches: [WC2026.bronzeMatch, WC2026.finalMatch] },
    ];

    rounds.forEach(round => {
      const section = document.createElement('div');
      section.className = 'knockout-round';
      section.innerHTML = `
        <div class="knockout-round-title">
          ${round.badge ? `<span class="round-badge">${round.badge}</span>` : ''}
          ${round.title}
          <div class="round-divider"></div>
        </div>
      `;
      const grid = document.createElement('div');
      grid.className = 'matches-grid';
      round.matches.forEach(m => {
        grid.appendChild(buildMatchCard(m));
      });
      section.appendChild(grid);
      container.appendChild(section);
    });
  }

  function buildMatchCard(matchDef) {
    const matchId = matchDef.matchId;
    const label = matchDef.label || matchId;
    const currentPick = state.predicciones.knockout[matchId] || '';

    // Determinar las opciones del dropdown
    let options = [];
    let slot1Label = '?';
    let slot2Label = '?';

    if (matchDef.s1 && matchDef.s2) {
      // R32
      const r32info = getOptionsForMatch(matchId);
      slot1Label = r32info.t1 || '?';

      if (matchDef.s2.thirdPool) {
        slot2Label = `Mejor 3° (${matchDef.s2.thirdPool.join('/')})`;
        const terceroOptions = r32info.t2Options || [];
        options = [slot1Label, ...terceroOptions].filter(Boolean);
        // Filtrar duplicados
        options = [...new Set(options)];
      } else {
        const [t1, t2] = getTeamsForMatch(matchId);
        slot1Label = t1 || '?';
        slot2Label = t2 || '?';
        options = [t1, t2].filter(Boolean);
      }
    } else {
      // R16, QF, SF, Final, Bronze
      const [t1, t2] = getTeamsForMatch(matchId);
      slot1Label = t1 || '?';
      slot2Label = t2 || '?';
      options = [t1, t2].filter(Boolean);
    }

    const complete = currentPick && options.includes(currentPick);

    const card = document.createElement('div');
    card.className = 'match-card' + (complete ? ' complete' : '');
    card.id = `match-card-${matchId}`;

    const isSlot1TBD = !slot1Label || slot1Label === '?';
    const isSlot2TBD = !slot2Label || slot2Label === '?' || (typeof slot2Label === 'string' && slot2Label.startsWith('Mejor 3°'));

    function slotHtml(team, tbd) {
      if (tbd || !team) return `<div class="match-slot tbd">TBD</div>`;
      return `<div class="match-slot">
        ${flagSpan(team, 'lg')}
        <span class="slot-name">${team}</span>
      </div>`;
    }

    let selectHtml = '';
    if (options.length === 0) {
      selectHtml = `<select class="match-select" data-match="${matchId}" disabled>
        <option value="">⏳ Completa rondas anteriores</option>
      </select>`;
    } else {
      const validPick = options.includes(currentPick) ? currentPick : '';
      selectHtml = `<select class="match-select" data-match="${matchId}">
        <option value="">-- elige ganador --</option>
        ${options.map(t => `<option value="${t}" ${validPick === t ? 'selected' : ''}>${t}</option>`).join('')}
      </select>`;
    }

    const slot2Display = isSlot2TBD && typeof slot2Label === 'string' && slot2Label.startsWith('Mejor 3°')
      ? `<div class="match-slot tbd" style="font-size:0.65rem">${slot2Label}</div>`
      : slotHtml(slot2Label, isSlot2TBD);

    card.innerHTML = `
      <div class="match-card-header">${label}</div>
      <div class="match-slots">
        ${slotHtml(slot1Label, isSlot1TBD)}
        <div class="match-vs">VS</div>
        ${slot2Display}
      </div>
      <div class="match-pick">${selectHtml}</div>
    `;
    return card;
  }

  function refreshKnockoutDropdowns() {
    // Re-renderizar todas las tarjetas knockout
    const allMatches = [
      ...WC2026.r32Bracket,
      ...WC2026.r16Bracket,
      ...WC2026.qfBracket,
      ...WC2026.sfBracket,
      WC2026.bronzeMatch,
      WC2026.finalMatch,
    ];
    allMatches.forEach(m => {
      const existing = document.getElementById(`match-card-${m.matchId}`);
      if (existing) {
        const newCard = buildMatchCard(m);
        existing.replaceWith(newCard);
      }
    });
  }

  function refreshDownstreamFromMatch(matchId) {
    const downstream = getAllDownstreamMatchIds(matchId);
    downstream.forEach(mid => {
      // Encontrar la definición del match
      const allMatches = [
        ...WC2026.r32Bracket,
        ...WC2026.r16Bracket,
        ...WC2026.qfBracket,
        ...WC2026.sfBracket,
        WC2026.bronzeMatch,
        WC2026.finalMatch,
      ];
      const matchDef = allMatches.find(m => m.matchId === mid);
      if (matchDef) {
        const existing = document.getElementById(`match-card-${mid}`);
        if (existing) {
          existing.replaceWith(buildMatchCard(matchDef));
        }
      }
    });
  }

  // ─── Render Panamá ────────────────────────────────────────
  function renderPanamaSection() {
    const container = document.getElementById('panama-matches-container');
    if (!container) return;
    container.innerHTML = '';

    WC2026.panamaMatches.forEach(match => {
      const data = state.predicciones.panama[match.key] || { golesPanama: '', golesRival: '' };
      const card = document.createElement('div');
      card.className = 'panama-match-card';
      card.innerHTML = `
        <div class="panama-match-header">
          ${flagSpan('Panamá')} Panamá
          <span style="opacity:0.7;margin:0 4px">vs</span>
          ${flagSpan(match.rival)} ${match.rival}
        </div>
        <div class="panama-score">
          <div class="panama-team">
            <div class="panama-flag-big">${flagSpan('Panamá', 'xl')}</div>
            <div class="panama-team-name">Panamá</div>
            <input type="number" class="score-input" min="0" max="20"
              data-panama-match="${match.key}" data-side="golesPanama"
              value="${data.golesPanama}" placeholder="0">
          </div>
          <div class="score-dash">—</div>
          <div class="panama-team">
            <div class="panama-flag-big">${flagSpan(match.rival, 'xl')}</div>
            <div class="panama-team-name">${match.rival}</div>
            <input type="number" class="score-input" min="0" max="20"
              data-panama-match="${match.key}" data-side="golesRival"
              value="${data.golesRival}" placeholder="0">
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // ─── Render Especiales ────────────────────────────────────
  function renderSpecials() {
    const allTeamsSorted = allTeams().sort();

    // Goleador (dropdown)
    const goleadorSel = document.getElementById('select-goleador');
    if (goleadorSel) {
      const current = state.predicciones.goleador || '';
      goleadorSel.innerHTML = `<option value="">-- elige --</option>` +
        WC2026.goleadores.map(g =>
          `<option value="${g}" ${g === current ? 'selected' : ''}>${g}</option>`
        ).join('');
    }

    // Campeón y Subcampeón (selectores)
    ['campeon', 'subcampeon'].forEach(key => {
      const sel = document.getElementById(`select-${key}`);
      if (!sel) return;
      const current = state.predicciones[key] || '';
      sel.innerHTML = `<option value="">-- elige --</option>` +
        allTeamsSorted.map(t => `<option value="${t}" ${t === current ? 'selected' : ''}>${t}</option>`).join('');
    });
  }

  // ─── Progreso ─────────────────────────────────────────────
  function countFilledFields() {
    let count = 0;
    const pred = state.predicciones;

    // nombre
    if (state.nombre.trim()) count++;

    // grupos: 12 × 2
    Object.keys(WC2026.groups).forEach(g => {
      const picks = pred.grupos[g];
      if (picks?.primero) count++;
      if (picks?.segundo) count++;
    });

    // mejores terceros (1 campo = completo cuando hay exactamente 8)
    if (pred.mejoresTerceros.length === 8) count++;

    // knockout: R32(16) + R16(8) + QF(4) + SF(2) + BRONZE(1) + FINAL(1) = 32
    const allKnockout = [
      ...WC2026.r32Bracket,
      ...WC2026.r16Bracket,
      ...WC2026.qfBracket,
      ...WC2026.sfBracket,
      WC2026.bronzeMatch,
      WC2026.finalMatch,
    ];
    allKnockout.forEach(m => {
      if (pred.knockout[m.matchId]) count++;
    });

    // Panamá: 3 partidos × 2 campos = 6
    WC2026.panamaMatches.forEach(m => {
      const d = pred.panama[m.key];
      if (d?.golesPanama !== '' && d?.golesPanama !== undefined && d?.golesPanama !== null) count++;
      if (d?.golesRival !== '' && d?.golesRival !== undefined && d?.golesRival !== null) count++;
    });

    // goleador, campeón, subcampeón
    if (pred.goleador?.trim()) count++;
    if (pred.campeon) count++;
    if (pred.subcampeon) count++;

    return count;
  }

  function updateProgress() {
    const filled = countFilledFields();
    const pct = Math.min(100, Math.round((filled / TOTAL_FIELDS) * 100));

    const bar = document.getElementById('progress-bar');
    const label = document.getElementById('progress-label');
    const btnExport = document.getElementById('btn-export');

    if (bar) bar.value = filled;
    if (label) label.textContent = `${pct}% completado (${filled}/${TOTAL_FIELDS})`;

    if (btnExport) {
      if (state.locked) {
        btnExport.textContent = '✓ Predicción exportada';
        btnExport.disabled = true;
        btnExport.classList.remove('ready');
      } else if (pct >= 100) {
        btnExport.textContent = '⬇ Exportar predicción';
        btnExport.disabled = false;
        btnExport.classList.add('ready');
      } else {
        btnExport.textContent = `Exportar (${pct}% completado)`;
        btnExport.disabled = true;
        btnExport.classList.remove('ready');
      }
    }
  }

  // ─── LocalStorage ─────────────────────────────────────────
  function saveToStorage() {
    try {
      localStorage.setItem(LS_DRAFT, JSON.stringify({
        nombre: state.nombre,
        predicciones: state.predicciones,
        lastSaved: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Error guardando en localStorage', e);
    }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(LS_DRAFT);
      if (raw) {
        const saved = JSON.parse(raw);
        state.nombre = saved.nombre || '';
        // Merge cuidadoso para no perder estructura
        if (saved.predicciones) {
          state.predicciones.grupos          = saved.predicciones.grupos          || {};
          state.predicciones.mejoresTerceros = saved.predicciones.mejoresTerceros || [];
          state.predicciones.knockout        = saved.predicciones.knockout        || {};
          state.predicciones.campeon         = saved.predicciones.campeon         || '';
          state.predicciones.subcampeon      = saved.predicciones.subcampeon      || '';
          state.predicciones.goleador        = saved.predicciones.goleador        || '';
          if (saved.predicciones.panama) {
            Object.assign(state.predicciones.panama, saved.predicciones.panama);
          }
        }
      }
      state.locked = localStorage.getItem(LS_LOCKED) === 'true';
    } catch (e) {
      console.error('Error cargando de localStorage', e);
    }
  }

  // ─── Exportar ─────────────────────────────────────────────
  function exportJSON() {
    if (state.locked) return;
    const filled = countFilledFields();
    if (filled < TOTAL_FIELDS) {
      showToast('Completa todos los campos antes de exportar.', 'error');
      return;
    }

    const exportObj = {
      nombre: state.nombre.trim(),
      timestamp: new Date().toISOString(),
      predicciones: state.predicciones
    };

    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `polla_2026_${state.nombre.trim().replace(/\s+/g, '_').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Bloquear
    localStorage.setItem(LS_LOCKED, 'true');
    state.locked = true;
    applyLockedState();
    showToast('¡Predicción exportada exitosamente! Ya no puedes modificarla.', 'success');
  }

  function applyLockedState() {
    document.body.classList.toggle('locked', state.locked);
    const banner = document.getElementById('locked-banner');
    if (banner) banner.classList.toggle('visible', state.locked);
    updateProgress();
  }

  // ─── Toast ────────────────────────────────────────────────
  function showToast(msg, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.style.cssText = `
        position:fixed; bottom:90px; left:50%; transform:translateX(-50%);
        padding:10px 22px; border-radius:20px; font-size:0.87rem; font-weight:600;
        z-index:9999; box-shadow:0 4px 16px rgba(0,0,0,0.2);
        transition:opacity 0.3s; pointer-events:none;
      `;
      document.body.appendChild(toast);
    }
    const colors = {
      success: { bg:'#1a9c4a', color:'#fff' },
      error:   { bg:'#CF142B', color:'#fff' },
      warning: { bg:'#e07b00', color:'#fff' },
      info:    { bg:'#003893', color:'#fff' },
    };
    const c = colors[type] || colors.info;
    toast.style.background = c.bg;
    toast.style.color = c.color;
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
  }

  // ─── Chips de grupo (click) ───────────────────────────────
  function handleTeamChipClick(e) {
    if (state.locked) return;
    const chip = e.target.closest('[data-team-pick]');
    if (!chip) return;

    const grpId = chip.dataset.teamPick;
    const team  = chip.dataset.team;
    const picks = state.predicciones.grupos[grpId] || { primero: '', segundo: '' };

    if (picks.primero === team) {
      // Desmarcar 1°: promover 2° a 1°
      picks.primero = picks.segundo;
      picks.segundo = '';
    } else if (picks.segundo === team) {
      // Desmarcar 2°
      picks.segundo = '';
    } else if (!picks.primero) {
      picks.primero = team;
    } else if (!picks.segundo) {
      picks.segundo = team;
    } else {
      // Ambos llenos → reemplazar 2°
      picks.segundo = team;
    }

    state.predicciones.grupos[grpId] = picks;
    invalidateGroupDownstream(grpId);
    refreshGroupCard(grpId);
    refreshKnockoutDropdowns();
    renderTerceros();
    debounceSave();
    updateProgress();
  }

  // ─── Manejador de cambios ─────────────────────────────────
  function handleChange(e) {
    if (state.locked) return;
    const target = e.target;

    // Nombre
    if (target.id === 'input-nombre') {
      state.nombre = target.value;
      debounceSave();
      updateProgress();
      return;
    }

    // (grupos: ver handleTeamChipClick)

    // Knockout pick
    if (target.dataset.match) {
      const matchId = target.dataset.match;
      const prev = state.predicciones.knockout[matchId];
      state.predicciones.knockout[matchId] = target.value;
      if (prev !== target.value) {
        // Invalidar y refrescar downstream
        invalidateDownstream(matchId);
        refreshDownstreamFromMatch(matchId);
        // Actualizar esta tarjeta
        const allMatches = [
          ...WC2026.r32Bracket, ...WC2026.r16Bracket,
          ...WC2026.qfBracket, ...WC2026.sfBracket,
          WC2026.bronzeMatch, WC2026.finalMatch,
        ];
        const matchDef = allMatches.find(m => m.matchId === matchId);
        if (matchDef) {
          const existing = document.getElementById(`match-card-${matchId}`);
          if (existing) existing.replaceWith(buildMatchCard(matchDef));
        }
      }
      debounceSave();
      updateProgress();
      return;
    }

    // Panamá scores
    if (target.dataset.panamaMatch) {
      const key = target.dataset.panamaMatch;
      const side = target.dataset.side;
      const val = target.value === '' ? '' : parseInt(target.value, 10);
      if (!state.predicciones.panama[key]) {
        state.predicciones.panama[key] = { golesPanama: '', golesRival: '' };
      }
      state.predicciones.panama[key][side] = val;
      debounceSave();
      updateProgress();
      return;
    }

    // Campeón / subcampeón
    if (target.id === 'select-campeon') {
      state.predicciones.campeon = target.value;
      debounceSave();
      updateProgress();
      return;
    }
    if (target.id === 'select-subcampeon') {
      state.predicciones.subcampeon = target.value;
      debounceSave();
      updateProgress();
      return;
    }

    // Goleador
    if (target.id === 'select-goleador') {
      state.predicciones.goleador = target.value;
      debounceSave();
      updateProgress();
      return;
    }
  }

  // ─── Inicializar ──────────────────────────────────────────
  function init() {
    loadFromStorage();

    // Nombre
    const nombreInput = document.getElementById('input-nombre');
    if (nombreInput) nombreInput.value = state.nombre;

    // Render todo
    renderGroupCards();
    renderTerceros();
    renderKnockoutRounds();
    renderPanamaSection();
    renderSpecials();

    // Evento global (delegación)
    document.addEventListener('click',  handleTeamChipClick);
    document.addEventListener('change', handleChange);
    document.addEventListener('input',  handleChange);

    // Botón exportar
    const btnExport = document.getElementById('btn-export');
    if (btnExport) {
      btnExport.addEventListener('click', exportJSON);
    }

    // Botón reset (para testing, oculto en producción)
    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('¿Seguro que quieres borrar tu predicción? Esta acción no se puede deshacer.')) {
          localStorage.removeItem(LS_DRAFT);
          localStorage.removeItem(LS_LOCKED);
          location.reload();
        }
      });
    }

    applyLockedState();
    updateProgress();
  }

  // API pública
  return { init, exportJSON, updateProgress };

})();

document.addEventListener('DOMContentLoaded', App.init);
