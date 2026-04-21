// ============================================================
// ranking.js — Ranking público · Polla Mundialista 2026
// ============================================================

const RankingApp = (function () {

  const LS_CACHE   = 'polla2026_admin_cache';
  const LS_RESULTS = 'polla2026_results';

  let participants = [];
  let localResults = null;
  let sortKey      = 'rank';
  let sortDir      = 'asc';

  // ─── Data loading ─────────────────────────────────────────
  function loadData() {
    try {
      const raw = localStorage.getItem(LS_CACHE);
      if (raw) participants = JSON.parse(raw);
    } catch (e) { console.error('Error cargando participantes', e); }

    try {
      const raw = localStorage.getItem(LS_RESULTS);
      if (raw) localResults = JSON.parse(raw);
    } catch (e) { console.error('Error cargando resultados', e); }
  }

  function getResults() {
    return localResults || WC2026.RESULTS;
  }

  // ─── Tabs ─────────────────────────────────────────────────
  function initTabs() {
    const bar = document.querySelector('.admin-tabs-bar');
    if (!bar) return;
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.admin-tab-btn');
      if (!btn) return;
      const tabId = btn.dataset.tab;
      document.querySelectorAll('.admin-tab-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.tab === tabId));
      document.querySelectorAll('.admin-tab-content').forEach(c =>
        c.classList.toggle('active', c.id === `tab-${tabId}`));
      if (tabId === 'selecciones') renderSeleccionesTab();
    });
  }

  // ─── Stats bar ────────────────────────────────────────────
  function updateStats() {
    const el = document.getElementById('stat-count');
    if (el) el.textContent = participants.length;
    const banner = document.getElementById('no-results-banner');
    if (banner) banner.style.display = getResults() ? 'none' : 'flex';
  }

  // ─── Scoring ──────────────────────────────────────────────
  function scoreParticipant(pred) {
    const results = getResults();
    const s = WC2026.scoring;
    const breakdown = {
      grupos: 0, terceros: 0,
      campeon: 0, subcampeon: 0, goleador: 0, balonDeOro: 0,
      panama: 0, specials: 0, extras: 0,
    };

    if (!results) return { total: 0, breakdown };

    Object.keys(WC2026.groups).forEach(grpId => {
      const u = pred.grupos?.[grpId];
      const r = results.grupos?.[grpId];
      if (!u || !r) return;
      if (u.primero && u.primero === r.primero) breakdown.grupos += s.grupoPosicionCorrecta;
      if (u.segundo && u.segundo === r.segundo) breakdown.grupos += s.grupoPosicionCorrecta;
    });

    if (results.mejoresTerceros && Array.isArray(pred.mejoresTerceros)) {
      pred.mejoresTerceros.forEach(team => {
        if (results.mejoresTerceros.includes(team)) breakdown.terceros += s.terceroPasa;
      });
    }

    if (pred.campeon    && pred.campeon    === results.campeon)    breakdown.campeon    = s.campeon;
    if (pred.subcampeon && pred.subcampeon === results.subcampeon) breakdown.subcampeon = s.subcampeon;

    if (pred.goleador && results.goleador &&
        pred.goleador.trim().toLowerCase() === results.goleador.trim().toLowerCase())
      breakdown.goleador = s.goleador;

    if (pred.balonDeOro && results.balonDeOro &&
        pred.balonDeOro.trim().toLowerCase() === results.balonDeOro.trim().toLowerCase())
      breakdown.balonDeOro = s.balonDeOro;

    WC2026.panamaMatches.forEach(m => {
      const u = pred.panama?.[m.key];
      const r = results.panama?.[m.key];
      if (!u || !r) return;
      const uP = parseInt(u.golesPanama), uR = parseInt(u.golesRival);
      const rP = parseInt(r.golesPanama), rR = parseInt(r.golesRival);
      if (isNaN(uP) || isNaN(uR) || isNaN(rP) || isNaN(rR)) return;
      if (uP === rP && uR === rR) {
        breakdown.panama += s.panamaResultado + s.panamaExacto;
      } else {
        const uRes = uP > uR ? 'W' : uP < uR ? 'L' : 'D';
        const rRes = rP > rR ? 'W' : rP < rR ? 'L' : 'D';
        if (uRes === rRes) breakdown.panama += s.panamaResultado;
      }
    });

    if (WC2026.specialMatches && results.specials) {
      WC2026.specialMatches.forEach(m => {
        const u = pred.specials?.[m.key];
        const r = results.specials?.[m.key];
        if (!u || !r) return;
        const u1 = parseInt(u.golesTeam1), u2 = parseInt(u.golesTeam2);
        const r1 = parseInt(r.golesTeam1), r2 = parseInt(r.golesTeam2);
        if (isNaN(u1) || isNaN(u2) || isNaN(r1) || isNaN(r2)) return;
        if (u1 === r1 && u2 === r2) {
          breakdown.specials += s.specialResultado + s.specialExacto;
        } else {
          const uRes = u1 > u2 ? 'W' : u1 < u2 ? 'L' : 'D';
          const rRes = r1 > r2 ? 'W' : r1 < r2 ? 'L' : 'D';
          if (uRes === rRes) breakdown.specials += s.specialResultado;
        }
      });
    }

    const ex  = pred.extras || {};
    const rex = results.extras || {};
    if (Object.keys(rex).length) {
      const cmpStr = (a, b) => a && b && String(a).trim() === String(b).trim();
      const cmpNum = (a, b) => a !== null && a !== '' && b !== null && Number(a) === Number(b);
      if (cmpStr(ex.primerGoleadorPanama, rex.primerGoleadorPanama)) breakdown.extras += s.extra;
      if (cmpNum(ex.golesYamal,           rex.golesYamal))           breakdown.extras += s.extra;
      if (cmpNum(ex.golesVinicius,        rex.golesVinicius))        breakdown.extras += s.extra;
      if (cmpNum(ex.golesEnFinal,         rex.golesEnFinal))         breakdown.extras += s.extra;
      if (cmpStr(ex.penalesEnFinal,       rex.penalesEnFinal))       breakdown.extras += s.extra;
      if (cmpStr(ex.masGolesCR7Messi,     rex.masGolesCR7Messi))     breakdown.extras += s.extra;
      if (cmpStr(ex.equipoMasGoles,       rex.equipoMasGoles))       breakdown.extras += s.extra;
      if (cmpStr(ex.equipoMasGoleado,     rex.equipoMasGoleado))     breakdown.extras += s.extra;
      if (cmpNum(ex.mayorGoleada,         rex.mayorGoleada))         breakdown.extras += s.extra;
    }

    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
    return { total, breakdown };
  }

  // ─── Ranking table ────────────────────────────────────────
  function renderTable() {
    const container = document.getElementById('table-container');
    if (!container) return;

    if (participants.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-hourglass-half"></i></div>
          <p>El organizador aún no ha cargado las predicciones.</p>
          <p>Vuelve más tarde para ver el ranking.</p>
        </div>`;
      return;
    }

    const scored = participants.map(p => ({
      ...p,
      score: scoreParticipant(p.predicciones),
    }));

    scored.sort((a, b) => {
      let va, vb;
      if (sortKey === 'nombre')       { va = a.nombre;                     vb = b.nombre; }
      else if (sortKey === 'grupos')  { va = a.score.breakdown.grupos;     vb = b.score.breakdown.grupos; }
      else if (sortKey === 'panama')  { va = a.score.breakdown.panama;     vb = b.score.breakdown.panama; }
      else if (sortKey === 'campeon') { va = a.predicciones.campeon || ''; vb = b.predicciones.campeon || ''; }
      else { va = a.score.total; vb = b.score.total; }

      if (typeof va === 'string')
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });

    const byTotal = [...scored].sort((a, b) => b.score.total - a.score.total);
    const rankMap = {};
    byTotal.forEach((p, i) => {
      const prev = i > 0 ? byTotal[i - 1].score.total : null;
      const key  = p.nombre + p.timestamp;
      rankMap[key] = (prev !== null && prev === p.score.total)
        ? rankMap[byTotal[i - 1].nombre + byTotal[i - 1].timestamp]
        : i + 1;
    });

    const headers = [
      { key: 'rank',    label: '#',           title: 'Posición' },
      { key: 'nombre',  label: 'Participante', title: 'Nombre' },
      { key: 'total',   label: 'Total',        title: 'Puntos totales' },
      { key: 'grupos',  label: 'Grupos',       title: 'Puntos de grupos' },
      { key: 'panama',  label: 'Panamá',       title: 'Puntos Especial Panamá' },
      { key: 'campeon', label: 'Campeón',      title: 'Equipo campeón elegido' },
    ];

    const table = document.createElement('table');
    table.className = 'ranking-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach(h => {
      const th = document.createElement('th');
      th.title = h.title;
      th.innerHTML = `${h.label}<span class="sort-arrow"></span>`;
      if (sortKey === h.key) th.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
      th.addEventListener('click', () => {
        sortKey = h.key;
        sortDir = (sortKey === h.key && sortDir === 'asc') ? 'desc' : (h.key === 'nombre' || h.key === 'campeon') ? 'asc' : 'desc';
        sortKey = h.key;
        renderTable();
      });
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    scored.forEach(p => {
      const key  = p.nombre + p.timestamp;
      const rank = rankMap[key];
      const tr   = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="rank-badge ${rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : ''}">${rank}</span></td>
        <td><strong>${escapeHtml(p.nombre)}</strong></td>
        <td><span class="pts-badge">${p.score.total}</span></td>
        <td>${p.score.breakdown.grupos}</td>
        <td>${p.score.breakdown.panama}</td>
        <td>${p.predicciones.campeon ? teamWithFlag(p.predicciones.campeon) : '—'}</td>
      `;
      tr.addEventListener('click', () => toggleExpandRow(tr, p, rank));
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
  }

  // ─── Expand row ───────────────────────────────────────────
  function toggleExpandRow(tr, participant, rank) {
    const existing = tr.nextElementSibling;
    if (existing && existing.classList.contains('expand-row')) {
      existing.remove();
      tr.classList.remove('expanded');
      return;
    }
    tr.classList.add('expanded');
    const expandTr = document.createElement('tr');
    expandTr.className = 'expand-row';
    const td = document.createElement('td');
    td.colSpan = 6;
    td.innerHTML = buildExpandContent(participant);
    expandTr.appendChild(td);
    tr.insertAdjacentElement('afterend', expandTr);
  }

  function buildExpandContent(p) {
    const pred    = p.predicciones;
    const results = getResults();
    const score   = scoreParticipant(pred);

    function statusClass(predicted, actual) {
      if (!actual) return 'pick-pending';
      return predicted === actual ? 'pick-correct' : 'pick-wrong';
    }
    function statusClassCI(predicted, actual) {
      if (!actual) return 'pick-pending';
      return (predicted || '').trim().toLowerCase() === (actual || '').trim().toLowerCase()
        ? 'pick-correct' : 'pick-wrong';
    }
    function statusClassNum(predicted, actual) {
      if (actual === null || actual === undefined) return 'pick-pending';
      if (predicted === null || predicted === '' || predicted === undefined) return 'pick-pending';
      return Number(predicted) === Number(actual) ? 'pick-correct' : 'pick-wrong';
    }

    // Grupos
    let gruposHtml = `<div class="expand-group"><h4><i class="fa-solid fa-layer-group"></i> Fase de Grupos</h4>`;
    Object.keys(WC2026.groups).forEach(grpId => {
      const g = pred.grupos?.[grpId];
      const r = results?.grupos?.[grpId];
      gruposHtml += `
        <div class="pick-item">
          <span>Grp ${grpId} — 1°</span>
          <span class="${statusClass(g?.primero, r?.primero)}">${g?.primero ? teamWithFlag(g.primero) : '—'}</span>
        </div>
        <div class="pick-item">
          <span>Grp ${grpId} — 2°</span>
          <span class="${statusClass(g?.segundo, r?.segundo)}">${g?.segundo ? teamWithFlag(g.segundo) : '—'}</span>
        </div>`;
    });
    gruposHtml += `</div>`;

    // Terceros
    let tercerosHtml = `<div class="expand-group"><h4><i class="fa-solid fa-medal"></i> Mejores Terceros</h4>`;
    (pred.mejoresTerceros || []).forEach(team => {
      const ok = results?.mejoresTerceros?.includes(team);
      tercerosHtml += `<div class="pick-item">
        <span>${teamWithFlag(team)}</span>
        <span class="${results ? (ok ? 'pick-correct' : 'pick-wrong') : 'pick-pending'}">${results ? (ok ? '✓' : '✗') : '?'}</span>
      </div>`;
    });
    tercerosHtml += `</div>`;

    // Panamá
    let panamaHtml = `<div class="expand-group"><h4>${flagSpan('Panamá')} Especial Panamá</h4>`;
    WC2026.panamaMatches.forEach(m => {
      const u = pred.panama?.[m.key];
      const r = results?.panama?.[m.key];
      const uScore = (u?.golesPanama !== '' && u?.golesPanama !== undefined) ? `${u.golesPanama}–${u.golesRival}` : '?–?';
      const rScore = r ? `${r.golesPanama}–${r.golesRival}` : null;
      let cls = 'pick-pending';
      if (r && u && u.golesPanama !== '' && u.golesRival !== '') {
        const exact = parseInt(u.golesPanama) === r.golesPanama && parseInt(u.golesRival) === r.golesRival;
        cls = exact ? 'pick-correct' : 'pick-wrong';
      }
      panamaHtml += `<div class="pick-item">
        <span>vs ${escapeHtml(m.rival)}</span>
        <span class="${cls}">${uScore}${rScore ? ` <span style="opacity:.5;font-size:.75em">(${rScore})</span>` : ''}</span>
      </div>`;
    });
    panamaHtml += `</div>`;

    // Partidos Destacados
    let specialsHtml = `<div class="expand-group"><h4><i class="fa-solid fa-star"></i> Partidos Destacados</h4>`;
    WC2026.specialMatches.forEach(m => {
      const u = pred.specials?.[m.key];
      const r = results?.specials?.[m.key];
      const uScore = (u?.golesTeam1 !== '' && u?.golesTeam1 !== undefined) ? `${u.golesTeam1}–${u.golesTeam2}` : '?–?';
      const rScore = r ? `${r.golesTeam1}–${r.golesTeam2}` : null;
      let cls = 'pick-pending';
      if (r && u && u.golesTeam1 !== '' && u.golesTeam2 !== '') {
        const exact = parseInt(u.golesTeam1) === r.golesTeam1 && parseInt(u.golesTeam2) === r.golesTeam2;
        cls = exact ? 'pick-correct' : 'pick-wrong';
      }
      specialsHtml += `<div class="pick-item">
        <span>${escapeHtml(m.team1)} vs ${escapeHtml(m.team2)}</span>
        <span class="${cls}">${uScore}${rScore ? ` <span style="opacity:.5;font-size:.75em">(${rScore})</span>` : ''}</span>
      </div>`;
    });
    specialsHtml += `</div>`;

    // Predicciones Especiales
    let espHtml = `<div class="expand-group"><h4><i class="fa-solid fa-trophy"></i> Predicciones Especiales</h4>
      <div class="pick-item"><span>Campeón</span>
        <span class="${statusClass(pred.campeon, results?.campeon)}">${pred.campeon ? teamWithFlag(pred.campeon) : '—'}</span>
      </div>
      <div class="pick-item"><span>Subcampeón</span>
        <span class="${statusClass(pred.subcampeon, results?.subcampeon)}">${pred.subcampeon ? teamWithFlag(pred.subcampeon) : '—'}</span>
      </div>
      <div class="pick-item"><span>Bota de Oro</span>
        <span class="${statusClassCI(pred.goleador, results?.goleador)}">${escapeHtml(pred.goleador || '—')}</span>
      </div>
      <div class="pick-item"><span>Balón de Oro</span>
        <span class="${statusClassCI(pred.balonDeOro, results?.balonDeOro)}">${escapeHtml(pred.balonDeOro || '—')}</span>
      </div>
    </div>`;

    // Extras
    const ex  = pred.extras  || {};
    const rex = results?.extras || {};
    const extrasRows = [
      { label: '1er gol Panamá', val: ex.primerGoleadorPanama, real: rex.primerGoleadorPanama, type: 'str' },
      { label: 'Goles Yamal',    val: ex.golesYamal,           real: rex.golesYamal,           type: 'num' },
      { label: 'Goles Vinicius', val: ex.golesVinicius,        real: rex.golesVinicius,        type: 'num' },
      { label: 'Goles en Final', val: ex.golesEnFinal,         real: rex.golesEnFinal,         type: 'num' },
      { label: 'Penales Final',  val: ex.penalesEnFinal,       real: rex.penalesEnFinal,       type: 'str' },
      { label: 'CR7 vs Messi',   val: ex.masGolesCR7Messi,     real: rex.masGolesCR7Messi,     type: 'str' },
      { label: 'Más goles',      val: ex.equipoMasGoles,       real: rex.equipoMasGoles,       type: 'str' },
      { label: 'Más goleado',    val: ex.equipoMasGoleado,     real: rex.equipoMasGoleado,     type: 'str' },
      { label: 'Mayor goleada',  val: ex.mayorGoleada,         real: rex.mayorGoleada,         type: 'num' },
    ];
    let extHtml = `<div class="expand-group"><h4><i class="fa-solid fa-bolt"></i> Extras</h4>`;
    extrasRows.forEach(row => {
      const display = (row.val !== null && row.val !== '' && row.val !== undefined)
        ? escapeHtml(String(row.val)) : '—';
      const cls = row.type === 'num'
        ? statusClassNum(row.val, row.real)
        : statusClass(row.val || '', row.real || '');
      extHtml += `<div class="pick-item"><span>${row.label}</span><span class="${cls}">${display}</span></div>`;
    });
    extHtml += `</div>`;

    // Desglose
    const bk = score.breakdown;
    const bkRows = [
      ['Grupos',       bk.grupos],
      ['Terceros',     bk.terceros],
      ['Panamá',       bk.panama],
      ['Destacados',   bk.specials],
      ['Campeón',      bk.campeon],
      ['Subcampeón',   bk.subcampeon],
      ['Bota de Oro',  bk.goleador],
      ['Balón de Oro', bk.balonDeOro],
      ['Extras',       bk.extras],
    ];
    let ptsHtml = `<div class="expand-group"><h4><i class="fa-solid fa-chart-bar"></i> Desglose</h4>`;
    bkRows.forEach(([label, val]) => {
      ptsHtml += `<div class="pick-item">
        <span>${label}</span>
        <span class="${val > 0 ? 'pick-correct' : 'pick-pending'}">${val} pts</span>
      </div>`;
    });
    ptsHtml += `<div class="pick-item pick-total">
      <span>TOTAL</span><span class="pts-badge">${score.total}</span>
    </div></div>`;

    return `<div class="expand-content">
      ${gruposHtml}${tercerosHtml}${panamaHtml}${specialsHtml}${espHtml}${extHtml}${ptsHtml}
    </div>`;
  }

  // ─── Tab: Selecciones ─────────────────────────────────────
  function renderSeleccionesTab() {
    const container = document.getElementById('selecciones-container');
    if (!container) return;

    if (participants.length === 0) {
      container.innerHTML = `
        <section class="form-section">
          <div class="section-body">
            <div class="empty-state">
              <div class="empty-icon"><i class="fa-solid fa-users"></i></div>
              <p>El organizador aún no ha cargado las predicciones.</p>
              <p>Vuelve más tarde para ver las selecciones.</p>
            </div>
          </div>
        </section>`;
      return;
    }

    const scored = participants.map(p => ({
      ...p,
      score: scoreParticipant(p.predicciones),
    })).sort((a, b) => b.score.total - a.score.total);

    scored.forEach((p, i) => {
      const prev = i > 0 ? scored[i - 1].score.total : null;
      p._rank = (prev !== null && prev === p.score.total) ? scored[i - 1]._rank : i + 1;
    });

    const cardsHtml = scored.map(p => {
      const pred = p.predicciones;
      const rank = p._rank;
      const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';

      const panPicks = WC2026.panamaMatches.map(m => {
        const u = pred.panama?.[m.key];
        const score = (u?.golesPanama !== '' && u?.golesPanama !== undefined && u?.golesRival !== undefined)
          ? `${u.golesPanama}–${u.golesRival}` : '?–?';
        return `<span class="sel-pan-item">vs ${escapeHtml(m.rival)}: <strong>${score}</strong></span>`;
      }).join('');

      const champHtml = pred.campeon    ? teamWithFlag(pred.campeon)    : '<span style="color:var(--label-4)">—</span>';
      const subHtml   = pred.subcampeon ? teamWithFlag(pred.subcampeon) : '<span style="color:var(--label-4)">—</span>';
      const goleHtml  = pred.goleador   ? escapeHtml(pred.goleador)     : '—';

      return `
        <div class="participant-card">
          <div class="participant-card-header">
            <span class="rank-badge ${rankClass}">${rank}</span>
            <span class="participant-card-name">${escapeHtml(p.nombre)}</span>
            <span class="participant-card-pts"><span class="pts-badge">${p.score.total}</span> pts</span>
          </div>
          <div class="participant-card-body">
            <div class="participant-picks-row">
              <span class="picks-label">Campeón</span>
              <span>${champHtml}</span>
            </div>
            <div class="participant-picks-row">
              <span class="picks-label">Subcampeón</span>
              <span>${subHtml}</span>
            </div>
            <div class="participant-picks-row">
              <span class="picks-label">Bota de Oro</span>
              <span style="font-weight:600">${goleHtml}</span>
            </div>
            <div class="participant-picks-row sel-panama-row">
              <span class="picks-label" style="flex-shrink:0">Panamá</span>
              <span class="sel-pan-picks">${panPicks}</span>
            </div>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = `
      <section class="form-section">
        <div class="section-header">
          <span class="section-icon"><i class="fa-solid fa-users"></i></span>
          <div class="section-header-text">
            <h2>Selecciones de Participantes</h2>
            <div class="section-sub">${scored.length} participante(s) · ordenados por puntuación</div>
          </div>
        </div>
        <div class="section-body">
          <div class="participant-cards-grid">${cardsHtml}</div>
        </div>
      </section>`;
  }

  // ─── Helpers ──────────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function flagSpan(teamName) {
    const code = WC2026.countryCodes?.[teamName] || 'un';
    return `<span class="fi fi-${code}" style="border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,0.2);margin-right:4px;vertical-align:middle"></span>`;
  }

  function teamWithFlag(teamName) {
    if (!teamName) return '—';
    return `${flagSpan(teamName)}${escapeHtml(teamName)}`;
  }

  // ─── Init ─────────────────────────────────────────────────
  function init() {
    loadData();
    initTabs();
    updateStats();
    renderTable();
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', RankingApp.init);
