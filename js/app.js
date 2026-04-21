// ============================================================
// app.js — Polla Mundialista 2026
// ============================================================

const App = (function () {

  // ─── Constantes ──────────────────────────────────────────
  const LS_DRAFT  = 'polla2026_draft';
  const LS_LOCKED = 'polla2026_locked';

  // Total de campos requeridos para 100%:
  // nombre(1) + grupos(12×2=24) + terceros_completo(1)
  // + panama(6: 3×2) + specials(16: 8×2)
  // + campeon(1) + subcampeon(1) + goleador(1) + balonDeOro(1)
  // + extras(9): primerGoleadorPanama, golesYamal, golesVinicius,
  //              golesEnFinal, penalesEnFinal, masGolesCR7Messi,
  //              equipoMasGoles, equipoMasGoleado, mayorGoleada
  // = 61
  const TOTAL_FIELDS = 61;

  // ─── Estado ──────────────────────────────────────────────
  let state = {
    nombre: '',
    locked: false,
    predicciones: {
      grupos: {},
      mejoresTerceros: [],
      campeon:    '',
      subcampeon: '',
      goleador:   '',   // Bota de Oro
      balonDeOro: '',
      extras: {
        primerGoleadorPanama: '',
        golesYamal:      null,
        golesVinicius:   null,
        golesEnFinal:    null,
        penalesEnFinal:  '',    // 'si' | 'no'
        masGolesCR7Messi: '',   // 'cr7' | 'messi' | 'igual'
        equipoMasGoles:   '',
        equipoMasGoleado: '',
        mayorGoleada:    null,
      },
      panama: {
        vsInglaterra: { golesPanama: '', golesRival: '' },
        vsCroacia:    { golesPanama: '', golesRival: '' },
        vsGhana:      { golesPanama: '', golesRival: '' },
      },
      specials: {
        mexico_sudafrica:   { golesTeam1: '', golesTeam2: '' },
        brasil_marruecos:   { golesTeam1: '', golesTeam2: '' },
        alemania_ecuador:   { golesTeam1: '', golesTeam2: '' },
        espana_uruguay:     { golesTeam1: '', golesTeam2: '' },
        francia_noruega:    { golesTeam1: '', golesTeam2: '' },
        argentina_jordania: { golesTeam1: '', golesTeam2: '' },
        colombia_portugal:  { golesTeam1: '', golesTeam2: '' },
        croacia_inglaterra: { golesTeam1: '', golesTeam2: '' },
      }
    }
  };

  // ─── Debounce ─────────────────────────────────────────────
  let saveTimer = null;
  function debounceSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveToStorage, 300);
  }

  // ─── Helpers ─────────────────────────────────────────────
  function allTeams() {
    return Object.values(WC2026.groups).flatMap(g => g.teams);
  }

  function countryCode(teamName) {
    return WC2026.countryCodes[teamName] || 'un';
  }

  function flagSpan(teamName, size = '') {
    const code = countryCode(teamName);
    return `<span class="fi fi-${code}${size ? ' fi-' + size : ''}"></span>`;
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

  function refreshGroupCard(grpId) {
    const container = document.getElementById(`group-card-${grpId}`);
    if (!container) return;
    container.replaceWith(buildGroupCard(grpId));
  }

  // ─── Render Mejores Terceros — por grupo ─────────────────
  function renderTerceros() {
    const container = document.getElementById('terceros-container');
    if (!container) return;

    // Teams already locked in as 1st or 2nd — grey them out
    const pickedAs12 = new Set();
    Object.values(state.predicciones.grupos).forEach(g => {
      if (g.primero) pickedAs12.add(g.primero);
      if (g.segundo) pickedAs12.add(g.segundo);
    });

    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'terceros-groups-grid';

    Object.entries(WC2026.groups).forEach(([grpId, grp]) => {
      const card = document.createElement('div');
      card.className = 'tercero-group-card';

      const header = document.createElement('div');
      header.className = 'tercero-group-header';
      header.innerHTML = `<span class="tercero-group-label">Grupo ${grpId}</span>`;
      card.appendChild(header);

      const list = document.createElement('div');
      list.className = 'tercero-team-list';

      grp.teams.forEach(team => {
        const isSelected = state.predicciones.mejoresTerceros.includes(team);
        const isTop2     = pickedAs12.has(team);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'tercero-chip' +
          (isSelected ? ' selected' : '') +
          (isTop2     ? ' dimmed'   : '');
        btn.innerHTML = `
          <span class="tercero-chip-flag">${flagSpan(team)}</span>
          <span class="tercero-chip-name">${team}</span>
          ${isSelected ? '<i class="fa-solid fa-check tercero-chip-check"></i>' : ''}
        `;
        btn.addEventListener('click', () => toggleTercero(team, grpId));
        list.appendChild(btn);
      });

      card.appendChild(list);
      grid.appendChild(card);
    });

    container.appendChild(grid);
    updateTercerosCounter();
  }

  function toggleTercero(team, grpId) {
    if (state.locked) return;
    const arr = state.predicciones.mejoresTerceros;
    const idx = arr.indexOf(team);

    if (idx >= 0) {
      // Deselect
      arr.splice(idx, 1);
    } else {
      // Auto-replace if another team from the same group is already chosen
      const groupTeams = WC2026.groups[grpId]?.teams || [];
      const prevFromGroup = arr.find(t => groupTeams.includes(t));

      if (prevFromGroup) {
        arr.splice(arr.indexOf(prevFromGroup), 1);
        arr.push(team);
      } else if (arr.length >= 8) {
        showToast('Ya elegiste 8 terceros. Quita uno antes de agregar otro.', 'warning');
        return;
      } else {
        arr.push(team);
      }
    }

    renderTerceros();
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
        <div class="panama-score">
          <div class="panama-team">
            <div class="panama-flag-big">${flagSpan('Panamá', 'xl')}</div>
            <div class="panama-team-name">Panamá</div>
            <input type="number" class="score-input" min="0" max="20"
              data-panama-match="${match.key}" data-side="golesPanama"
              value="${data.golesPanama}" placeholder="-">
          </div>
          <div class="score-dash">—</div>
          <div class="panama-team">
            <div class="panama-flag-big">${flagSpan(match.rival, 'xl')}</div>
            <div class="panama-team-name">${match.rival}</div>
            <input type="number" class="score-input" min="0" max="20"
              data-panama-match="${match.key}" data-side="golesRival"
              value="${data.golesRival}" placeholder="-">
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // ─── Render Partidos Especiales ───────────────────────────
  function renderSpecialMatches() {
    const container = document.getElementById('special-matches-container');
    if (!container) return;
    container.innerHTML = '';

    WC2026.specialMatches.forEach(match => {
      const data = state.predicciones.specials[match.key] || { golesTeam1: '', golesTeam2: '' };
      const card = document.createElement('div');
      card.className = 'panama-match-card special-match-card';
      card.innerHTML = `
        ${match.badge ? `<div class="match-badge-bar">${match.badge}</div>` : ''}
        <div class="panama-score">
          <div class="panama-team">
            <div class="panama-flag-big">${flagSpan(match.team1, 'xl')}</div>
            <div class="panama-team-name">${match.team1}</div>
            <input type="number" class="score-input special-score" min="0" max="20"
              data-special-match="${match.key}" data-side="golesTeam1"
              value="${data.golesTeam1}" placeholder="-">
          </div>
          <div class="score-dash">—</div>
          <div class="panama-team">
            <div class="panama-flag-big">${flagSpan(match.team2, 'xl')}</div>
            <div class="panama-team-name">${match.team2}</div>
            <input type="number" class="score-input special-score" min="0" max="20"
              data-special-match="${match.key}" data-side="golesTeam2"
              value="${data.golesTeam2}" placeholder="-">
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  // ─── Render Predicciones Especiales ──────────────────────
  function renderSpecialsSection() {
    const container = document.getElementById('specials-container');
    if (!container) return;
    const pred = state.predicciones;
    const allTeamsSorted = allTeams().sort();

    // Helper: select options
    function teamOptions(current) {
      return `<option value="">-- elige --</option>` +
        allTeamsSorted.map(t => `<option value="${t}"${t === current ? ' selected' : ''}>${t}</option>`).join('');
    }
    function playerOptions(list, current) {
      return `<option value="">-- elige --</option>` +
        list.map(p => `<option value="${p}"${p === current ? ' selected' : ''}>${p}</option>`).join('');
    }

    // Helper: stepper HTML
    function stepperHtml(key, value, label, sub, icon, min = 0, max = 20) {
      const val = value === null ? null : Number(value);
      const display = val === null ? '—' : String(val);
      const isEmpty = val === null;
      return `
        <div class="pred-card pred-card-stepper">
          <div class="pred-card-icon">${icon}</div>
          <div class="pred-card-title">${label}</div>
          <div class="pred-card-sub">${sub}</div>
          <div class="pred-pts-tag">3 pts</div>
          <div class="stepper-wrap">
            <button class="stepper-btn" type="button"
              data-stepper-key="${key}" data-stepper-action="dec" data-stepper-min="${min}" data-stepper-max="${max}">−</button>
            <span class="stepper-val${isEmpty ? ' empty' : ''}" id="stepper-${key}">${display}</span>
            <button class="stepper-btn" type="button"
              data-stepper-key="${key}" data-stepper-action="inc" data-stepper-min="${min}" data-stepper-max="${max}">+</button>
          </div>
        </div>`;
    }

    // Helper: toggle group HTML
    function toggleHtml(key, options, current) {
      const btns = options.map(o =>
        `<button class="toggle-btn toggle-${o.val}${current === o.val ? ' selected' : ''}"
          type="button" data-toggle-key="${key}" data-toggle-val="${o.val}">
          ${o.label}
        </button>`
      ).join('');
      return `<div class="toggle-group">${btns}</div>`;
    }

    // Helper: player chip grid
    function playerChipsHtml(players, current) {
      return `<div class="player-chip-grid">
        ${players.map(p =>
          `<button class="player-chip${current === p ? ' selected' : ''}"
            type="button" data-player-pick="primerGoleadorPanama" data-player="${p}">${p}</button>`
        ).join('')}
      </div>`;
    }

    container.innerHTML = `

      <!-- ══ TROFEOS ══════════════════════════════════════════ -->
      <div class="pred-group">
        <div class="pred-group-label"><i class="fa-solid fa-trophy"></i> Trofeos del Torneo</div>
        <div class="pred-grid-4">

          <div class="pred-card">
            <div class="pred-card-icon"><i class="fa-solid fa-trophy" style="color:var(--yellow)"></i></div>
            <div class="pred-card-title">Campeón del Mundial</div>
            <div class="pred-card-sub">El pick más valioso</div>
            <div class="pred-pts-tag">10 pts</div>
            <select id="select-campeon" class="special-select">${teamOptions(pred.campeon)}</select>
          </div>

          <div class="pred-card">
            <div class="pred-card-icon"><i class="fa-solid fa-medal" style="color:var(--label-3)"></i></div>
            <div class="pred-card-title">Subcampeón</div>
            <div class="pred-card-sub">¿Quién llega a la final?</div>
            <div class="pred-pts-tag">3 pts</div>
            <select id="select-subcampeon" class="special-select">${teamOptions(pred.subcampeon)}</select>
          </div>

          <div class="pred-card">
            <div class="pred-card-icon"><i class="fa-solid fa-futbol"></i></div>
            <div class="pred-card-title">Bota de Oro</div>
            <div class="pred-card-sub">Máximo goleador del torneo</div>
            <div class="pred-pts-tag">3 pts</div>
            <select id="select-goleador" class="special-select">${playerOptions(WC2026.goleadores, pred.goleador)}</select>
          </div>

          <div class="pred-card">
            <div class="pred-card-icon"><i class="fa-solid fa-star" style="color:var(--yellow)"></i></div>
            <div class="pred-card-title">Balón de Oro</div>
            <div class="pred-card-sub">Mejor jugador del torneo</div>
            <div class="pred-pts-tag">3 pts</div>
            <select id="select-balon-de-oro" class="special-select">${playerOptions(WC2026.balonDeOroCandidates, pred.balonDeOro)}</select>
          </div>

        </div>
      </div>

      <!-- ══ EXTRAS ════════════════════════════════════════════ -->
      <div class="pred-group">
        <div class="pred-group-label"><i class="fa-solid fa-wand-magic-sparkles"></i> Extras del Torneo</div>
        <div class="pred-grid-3">

          ${stepperHtml('golesYamal', pred.extras.golesYamal,
            'Goles de Lamine Yamal',
            '<span class="fi fi-es" style="border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,.15);margin-right:4px;vertical-align:middle"></span>España · ¿cuántos mete?',
            '<i class="fa-solid fa-star"></i>')}

          ${stepperHtml('golesVinicius', pred.extras.golesVinicius,
            'Goles de Vinicius Jr.',
            '<span class="fi fi-br" style="border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,.15);margin-right:4px;vertical-align:middle"></span>Brasil · ¿cuántos mete?',
            '<i class="fa-solid fa-fire"></i>')}

          <div class="pred-card pred-card-players">
            <div class="pred-card-icon"><span class="fi fi-pa" style="border-radius:4px;box-shadow:0 1px 5px rgba(0,0,0,.2);font-size:1.5rem"></span></div>
            <div class="pred-card-title">Primer Goleador de Panamá</div>
            <div class="pred-card-sub">¿Quién marca el 1er gol Canalero?</div>
            <div class="pred-pts-tag">3 pts</div>
            ${playerChipsHtml(WC2026.panamaPlayers, pred.extras.primerGoleadorPanama)}
          </div>

          ${stepperHtml('golesEnFinal', pred.extras.golesEnFinal,
            'Goles en la Final', 'Total entre ambos equipos', '<i class="fa-solid fa-futbol"></i>', 0, 20)}

          <div class="pred-card">
            <div class="pred-card-icon"><i class="fa-solid fa-bullseye"></i></div>
            <div class="pred-card-title">¿Habrá penales en la Final?</div>
            <div class="pred-card-sub">¿Llega a definirse en tanda?</div>
            <div class="pred-pts-tag">3 pts</div>
            ${toggleHtml('penalesEnFinal', [
              { val: 'si', label: 'Sí' },
              { val: 'no', label: 'No' }
            ], pred.extras.penalesEnFinal)}
          </div>

          <div class="pred-card">
            <div class="pred-card-icon"><i class="fa-solid fa-bolt"></i></div>
            <div class="pred-card-title">CR7 vs Messi: Penales</div>
            <div class="pred-card-sub">¿Quién mete más penales en el torneo?</div>
            <div class="pred-pts-tag">3 pts</div>
            ${toggleHtml('masGolesCR7Messi', [
              { val: 'cr7',   label: '<span class="fi fi-pt" style="border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,.18);margin-right:4px;vertical-align:middle"></span>CR7' },
              { val: 'igual', label: 'Igual' },
              { val: 'messi', label: '<span class="fi fi-ar" style="border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,.18);margin-right:4px;vertical-align:middle"></span>Messi' }
            ], pred.extras.masGolesCR7Messi)}
          </div>

          <div class="pred-card">
            <div class="pred-card-icon"><i class="fa-solid fa-ranking-star" style="color:var(--yellow)"></i></div>
            <div class="pred-card-title">Equipo con Más Goles</div>
            <div class="pred-card-sub">¿Quién mete más goles en todo el torneo?</div>
            <div class="pred-pts-tag">3 pts</div>
            <select id="select-equipo-mas-goles" class="special-select">${teamOptions(pred.extras.equipoMasGoles)}</select>
          </div>

          <div class="pred-card">
            <div class="pred-card-icon"><i class="fa-solid fa-shield-halved" style="color:#ef4444"></i></div>
            <div class="pred-card-title">Equipo Más Goleado</div>
            <div class="pred-card-sub">¿Quién recibe más goles en contra?</div>
            <div class="pred-pts-tag">3 pts</div>
            <select id="select-equipo-mas-goleado" class="special-select">${teamOptions(pred.extras.equipoMasGoleado)}</select>
          </div>

          ${stepperHtml('mayorGoleada', pred.extras.mayorGoleada,
            'Mayor Goleada del Torneo',
            'Diferencia de goles del partido más abultado',
            '<i class="fa-solid fa-fire-flame-curved" style="color:#f97316"></i>', 1, 20)}

        </div>
      </div>
    `;
  }

  // ─── Indicadores de sección completa ────────────────────
  function updateSectionIndicators() {
    const pred = state.predicciones;

    const done = {
      nombre: state.nombre.trim() !== '',
      grupos: Object.keys(WC2026.groups).every(g => pred.grupos[g]?.primero && pred.grupos[g]?.segundo),
      terceros: pred.mejoresTerceros.length === 8,
      panama: WC2026.panamaMatches.every(m => {
        const d = pred.panama[m.key];
        return d?.golesPanama !== '' && d?.golesPanama !== null && d?.golesPanama !== undefined
            && d?.golesRival   !== '' && d?.golesRival   !== null && d?.golesRival   !== undefined;
      }),
      destacados: WC2026.specialMatches.every(m => {
        const d = pred.specials?.[m.key];
        return d?.golesTeam1 !== '' && d?.golesTeam1 !== null && d?.golesTeam1 !== undefined
            && d?.golesTeam2 !== '' && d?.golesTeam2 !== null && d?.golesTeam2 !== undefined;
      }),
      predicciones: !!(pred.campeon && pred.subcampeon && pred.goleador && pred.balonDeOro &&
        pred.extras.primerGoleadorPanama &&
        pred.extras.golesYamal !== null && pred.extras.golesYamal !== '' &&
        pred.extras.golesVinicius !== null && pred.extras.golesVinicius !== '' &&
        pred.extras.golesEnFinal !== null && pred.extras.golesEnFinal !== '' &&
        pred.extras.penalesEnFinal && pred.extras.masGolesCR7Messi &&
        pred.extras.equipoMasGoles && pred.extras.equipoMasGoleado &&
        pred.extras.mayorGoleada !== null && pred.extras.mayorGoleada !== ''),
    };

    Object.entries(done).forEach(([id, isDone]) => {
      const section = document.querySelector(`.form-section[data-section-id="${id}"]`);
      if (section) section.classList.toggle('section-done', isDone);
    });
  }

  // ─── Progreso ─────────────────────────────────────────────
  function countFilledFields() {
    let count = 0;
    const pred = state.predicciones;

    if (state.nombre.trim()) count++;

    Object.keys(WC2026.groups).forEach(g => {
      const picks = pred.grupos[g];
      if (picks?.primero) count++;
      if (picks?.segundo) count++;
    });

    if (pred.mejoresTerceros.length === 8) count++;

    // Panamá: 3 × 2 = 6
    WC2026.panamaMatches.forEach(m => {
      const d = pred.panama[m.key];
      if (d?.golesPanama !== '' && d?.golesPanama !== undefined && d?.golesPanama !== null) count++;
      if (d?.golesRival   !== '' && d?.golesRival   !== undefined && d?.golesRival   !== null) count++;
    });

    // Partidos especiales: 7 × 2 = 14
    WC2026.specialMatches.forEach(m => {
      const d = pred.specials?.[m.key];
      if (d?.golesTeam1 !== '' && d?.golesTeam1 !== undefined && d?.golesTeam1 !== null) count++;
      if (d?.golesTeam2 !== '' && d?.golesTeam2 !== undefined && d?.golesTeam2 !== null) count++;
    });

    // Trofeos = 4
    if (pred.goleador?.trim()) count++;
    if (pred.campeon) count++;
    if (pred.subcampeon) count++;
    if (pred.balonDeOro?.trim()) count++;

    // Extras = 9
    const ex = pred.extras;
    if (ex.primerGoleadorPanama) count++;
    if (ex.golesYamal !== null && ex.golesYamal !== '') count++;
    if (ex.golesVinicius !== null && ex.golesVinicius !== '') count++;
    if (ex.golesEnFinal !== null && ex.golesEnFinal !== '') count++;
    if (ex.penalesEnFinal) count++;
    if (ex.masGolesCR7Messi) count++;
    if (ex.equipoMasGoles) count++;
    if (ex.equipoMasGoleado) count++;
    if (ex.mayorGoleada !== null && ex.mayorGoleada !== '') count++;

    return count;
  }

  function updateProgress() {
    const filled = countFilledFields();
    const pct = Math.min(100, Math.round((filled / TOTAL_FIELDS) * 100));

    const bar = document.getElementById('progress-bar');
    const label = document.getElementById('progress-label');
    const btnExport = document.getElementById('btn-export');

    if (bar) { bar.value = filled; bar.max = TOTAL_FIELDS; }
    if (label) label.textContent = `${pct}% · ${filled}/${TOTAL_FIELDS}`;

    if (btnExport) {
      if (state.locked) {
        btnExport.textContent = '✓ Predicción exportada';
        btnExport.disabled = true;
        btnExport.classList.remove('ready');
      } else if (pct >= 100) {
        btnExport.textContent = 'Exportar';
        btnExport.disabled = false;
        btnExport.classList.add('ready');
      } else {
        btnExport.textContent = `Exportar · ${pct}%`;
        btnExport.disabled = true;
        btnExport.classList.remove('ready');
      }
    }

    updateSectionIndicators();
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
        if (saved.predicciones) {
          const sp = saved.predicciones;
          state.predicciones.grupos          = sp.grupos          || {};
          state.predicciones.mejoresTerceros = sp.mejoresTerceros || [];
          state.predicciones.campeon         = sp.campeon         || '';
          state.predicciones.subcampeon      = sp.subcampeon      || '';
          state.predicciones.goleador        = sp.goleador        || '';
          state.predicciones.balonDeOro      = sp.balonDeOro      || '';
          if (sp.extras) {
            Object.assign(state.predicciones.extras, sp.extras);
          }
          if (sp.panama) {
            Object.assign(state.predicciones.panama, sp.panama);
          }
          if (sp.specials) {
            Object.assign(state.predicciones.specials, sp.specials);
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
      success: { bg:'#059669', color:'#fff' },
      error:   { bg:'#dc2626', color:'#fff' },
      warning: { bg:'#d97706', color:'#fff' },
      info:    { bg:'#3b5bdb', color:'#fff' },
    };
    const c = colors[type] || colors.info;
    toast.style.background = c.bg;
    toast.style.color = c.color;
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
  }

  // ─── Ripple effect ────────────────────────────────────────
  function addRipple(el, e) {
    const existing = el.querySelector('.ripple');
    if (existing) existing.remove();
    const r = document.createElement('span');
    r.className = 'ripple';
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.4;
    r.style.width = r.style.height = size + 'px';
    r.style.left = (e.clientX - rect.left - size / 2) + 'px';
    r.style.top  = (e.clientY - rect.top  - size / 2) + 'px';
    el.appendChild(r);
    setTimeout(() => r.remove(), 500);
  }

  // ─── Chips de grupo (click) ───────────────────────────────
  function handleTeamChipClick(e) {
    if (state.locked) return;
    const chip = e.target.closest('[data-team-pick]');
    if (!chip) return;
    addRipple(chip, e);

    const grpId = chip.dataset.teamPick;
    const team  = chip.dataset.team;
    const picks = state.predicciones.grupos[grpId] || { primero: '', segundo: '' };

    if (picks.primero === team) {
      picks.primero = picks.segundo;
      picks.segundo = '';
    } else if (picks.segundo === team) {
      picks.segundo = '';
    } else if (!picks.primero) {
      picks.primero = team;
    } else if (!picks.segundo) {
      picks.segundo = team;
    } else {
      picks.segundo = team;
    }

    state.predicciones.grupos[grpId] = picks;
    refreshGroupCard(grpId);
    renderTerceros();
    debounceSave();
    updateProgress();
  }

  // ─── Stepper handler ──────────────────────────────────────
  function handleStepperClick(e) {
    if (state.locked) return;
    const btn = e.target.closest('[data-stepper-action]');
    if (!btn) return;

    const key    = btn.dataset.stepperKey;
    const action = btn.dataset.stepperAction;
    const min    = parseInt(btn.dataset.stepperMin ?? 0, 10);
    const max    = parseInt(btn.dataset.stepperMax ?? 20, 10);

    let current = state.predicciones.extras[key];
    if (current === null || current === '') current = action === 'inc' ? -1 : 1;
    current = Number(current);

    const newVal = action === 'inc'
      ? Math.min(max, current + 1)
      : Math.max(min, current - 1);

    state.predicciones.extras[key] = newVal;

    // Update display with pop animation
    const display = document.getElementById(`stepper-${key}`);
    if (display) {
      display.textContent = String(newVal);
      display.classList.remove('empty', 'pop');
      void display.offsetWidth; // force reflow
      display.classList.add('pop');
    }

    addRipple(btn, e);
    debounceSave();
    updateProgress();
  }

  // ─── Toggle handler ───────────────────────────────────────
  function handleToggleClick(e) {
    if (state.locked) return;
    const btn = e.target.closest('[data-toggle-key]');
    if (!btn) return;

    const key = btn.dataset.toggleKey;
    const val = btn.dataset.toggleVal;

    // If already selected, deselect
    if (state.predicciones.extras[key] === val) {
      state.predicciones.extras[key] = '';
    } else {
      state.predicciones.extras[key] = val;
    }

    // Update all buttons in this group
    document.querySelectorAll(`[data-toggle-key="${key}"]`).forEach(b => {
      b.classList.toggle('selected', b.dataset.toggleVal === state.predicciones.extras[key]);
    });

    addRipple(btn, e);
    debounceSave();
    updateProgress();
  }

  // ─── Player chip handler ──────────────────────────────────
  function handlePlayerChipClick(e) {
    if (state.locked) return;
    const chip = e.target.closest('[data-player-pick]');
    if (!chip) return;

    const key    = chip.dataset.playerPick;
    const player = chip.dataset.player;

    if (state.predicciones.extras[key] === player) {
      state.predicciones.extras[key] = '';
    } else {
      state.predicciones.extras[key] = player;
    }

    // Update all chips in this group
    document.querySelectorAll(`[data-player-pick="${key}"]`).forEach(c => {
      c.classList.toggle('selected', c.dataset.player === state.predicciones.extras[key]);
    });

    addRipple(chip, e);
    debounceSave();
    updateProgress();
  }

  // ─── Manejador de cambios (inputs/selects) ───────────────
  function handleChange(e) {
    if (state.locked) return;
    const target = e.target;

    if (target.id === 'input-nombre') {
      state.nombre = target.value;
      debounceSave();
      updateProgress();
      return;
    }

    if (target.dataset.panamaMatch) {
      const key  = target.dataset.panamaMatch;
      const side = target.dataset.side;
      const val  = target.value === '' ? '' : parseInt(target.value, 10);
      if (!state.predicciones.panama[key]) {
        state.predicciones.panama[key] = { golesPanama: '', golesRival: '' };
      }
      state.predicciones.panama[key][side] = val;
      debounceSave();
      updateProgress();
      return;
    }

    if (target.dataset.specialMatch) {
      const key  = target.dataset.specialMatch;
      const side = target.dataset.side;
      const val  = target.value === '' ? '' : parseInt(target.value, 10);
      if (!state.predicciones.specials[key]) {
        state.predicciones.specials[key] = { golesTeam1: '', golesTeam2: '' };
      }
      state.predicciones.specials[key][side] = val;
      debounceSave();
      updateProgress();
      return;
    }

    if (target.id === 'select-campeon') {
      state.predicciones.campeon = target.value;
      debounceSave(); updateProgress(); return;
    }
    if (target.id === 'select-subcampeon') {
      state.predicciones.subcampeon = target.value;
      debounceSave(); updateProgress(); return;
    }
    if (target.id === 'select-goleador') {
      state.predicciones.goleador = target.value;
      debounceSave(); updateProgress(); return;
    }
    if (target.id === 'select-balon-de-oro') {
      state.predicciones.balonDeOro = target.value;
      debounceSave(); updateProgress(); return;
    }
    if (target.id === 'select-equipo-mas-goles') {
      state.predicciones.extras.equipoMasGoles = target.value;
      debounceSave(); updateProgress(); return;
    }
    if (target.id === 'select-equipo-mas-goleado') {
      state.predicciones.extras.equipoMasGoleado = target.value;
      debounceSave(); updateProgress(); return;
    }
  }

  // ─── Inicializar ──────────────────────────────────────────
  function init() {
    loadFromStorage();

    const nombreInput = document.getElementById('input-nombre');
    if (nombreInput) nombreInput.value = state.nombre;

    renderGroupCards();
    renderTerceros();
    renderPanamaSection();
    renderSpecialMatches();
    renderSpecialsSection();

    // Event delegation — click
    document.addEventListener('click', (e) => {
      handleTeamChipClick(e);
      handleStepperClick(e);
      handleToggleClick(e);
      handlePlayerChipClick(e);
    });

    // Event delegation — change/input
    document.addEventListener('change', handleChange);
    document.addEventListener('input',  handleChange);

    const btnExport = document.getElementById('btn-export');
    if (btnExport) btnExport.addEventListener('click', exportJSON);

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

    // Collapsible sections — start all collapsed, wire click
    document.querySelectorAll('.section-header[data-collapsible]').forEach(header => {
      const section = header.closest('.form-section');
      const body    = section?.querySelector('.section-body');
      const chevron = header.querySelector('.section-chevron');
      // Collapse on load
      if (body)    body.classList.add('is-collapsed');
      if (chevron) chevron.classList.add('chevron-closed');
      header.setAttribute('aria-expanded', 'false');

      header.addEventListener('click', (e) => {
        if (e.target.closest('button, select, input, a')) return;
        const b = section.querySelector('.section-body');
        const c = header.querySelector('.section-chevron');
        const isNowCollapsed = b.classList.toggle('is-collapsed');
        c?.classList.toggle('chevron-closed', isNowCollapsed);
        header.setAttribute('aria-expanded', String(!isNowCollapsed));
      });
    });

    // Reset form button (always visible in footer)
    const btnResetForm = document.getElementById('btn-reset-form');
    if (btnResetForm) {
      btnResetForm.addEventListener('click', () => {
        if (confirm('¿Seguro que quieres borrar toda tu predicción? Esta acción no se puede deshacer.')) {
          localStorage.removeItem(LS_DRAFT);
          localStorage.removeItem(LS_LOCKED);
          location.reload();
        }
      });
    }

    applyLockedState();
    updateProgress();
  }

  return { init, exportJSON, updateProgress };

})();

document.addEventListener('DOMContentLoaded', App.init);
