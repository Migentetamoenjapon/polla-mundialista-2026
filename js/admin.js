// ============================================================
// admin.js — Panel de Administración · Polla Mundialista 2026
// ============================================================

const AdminApp = (function () {

  const LS_CACHE   = 'polla2026_admin_cache';
  const LS_RESULTS = 'polla2026_results';

  let participants  = [];
  let sortKey       = 'rank';
  let sortDir       = 'asc';
  let localResults  = null;
  let resultFormBuilt = false;

  // ─── Results localStorage ────────────────────────────────
  function loadLocalResults() {
    try {
      const raw = localStorage.getItem(LS_RESULTS);
      if (raw) localResults = JSON.parse(raw);
    } catch (e) { console.error('Error cargando resultados', e); }
  }

  function saveLocalResults() {
    try { localStorage.setItem(LS_RESULTS, JSON.stringify(localResults)); }
    catch (e) { /* quota */ }
  }

  function getResults() {
    return localResults || WC2026.RESULTS;
  }

  // ─── Login ────────────────────────────────────────────────
  function initLogin() {
    const form   = document.getElementById('login-form');
    const input  = document.getElementById('pwd-input');
    const errMsg = document.getElementById('login-error');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (input.value === WC2026.adminPassword) {
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-panel').classList.add('visible');
        loadCachedParticipants();
      } else {
        input.classList.add('error');
        errMsg.classList.add('visible');
        input.value = '';
        input.focus();
      }
    });

    input.addEventListener('input', () => {
      input.classList.remove('error');
      errMsg.classList.remove('visible');
    });
  }

  // ─── Tabs ─────────────────────────────────────────────────
  function initTabs() {
    const bar = document.querySelector('.admin-tabs-bar');
    if (!bar) return;
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('.admin-tab-btn');
      if (!btn) return;
      switchTab(btn.dataset.tab);
    });
  }

  function switchTab(tabId) {
    document.querySelectorAll('.admin-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tabId);
    });
    document.querySelectorAll('.admin-tab-content').forEach(c => {
      c.classList.toggle('active', c.id === `tab-${tabId}`);
    });

    if (tabId === 'selecciones') {
      renderSeleccionesTab();
    }
    if (tabId === 'resultados' && !resultFormBuilt) {
      buildResultsForm();
      resultFormBuilt = true;
    }
  }

  // ─── Caché ────────────────────────────────────────────────
  function loadCachedParticipants() {
    try {
      const raw = localStorage.getItem(LS_CACHE);
      if (raw) { participants = JSON.parse(raw); renderAll(); }
    } catch (e) { console.error('Error cargando caché admin', e); }
  }

  function saveCache() {
    try { localStorage.setItem(LS_CACHE, JSON.stringify(participants)); }
    catch (e) { /* quota */ }
  }

  // ─── Subida ───────────────────────────────────────────────
  function initUpload() {
    const zone      = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    if (!zone || !fileInput) return;

    zone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) handleFiles(e.target.files);
      fileInput.value = '';
    });
    zone.addEventListener('dragover',  (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', ()  => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });

    const btnClear = document.getElementById('btn-clear');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        if (confirm('¿Eliminar todos los participantes cargados?')) {
          participants = [];
          saveCache();
          renderAll();
        }
      });
    }
  }

  async function handleFiles(files) {
    const results = await Promise.allSettled(
      Array.from(files).map(readFileAsJSON)
    );

    let added = 0, skipped = 0, errors = 0;

    results.forEach((r) => {
      if (r.status === 'rejected') { errors++; return; }
      const obj = r.value;
      if (!validateSchema(obj)) { skipped++; return; }

      const key = `${obj.nombre}_${obj.timestamp}`;
      const existIdx = participants.findIndex(
        p => `${p.nombre}_${p.timestamp}` === key
      );
      if (existIdx >= 0) { skipped++; return; }

      // Mismo nombre, timestamp distinto → reemplazar con el más nuevo
      const sameNameIdx = participants.findIndex(p => p.nombre === obj.nombre);
      if (sameNameIdx >= 0) {
        if (new Date(obj.timestamp) > new Date(participants[sameNameIdx].timestamp)) {
          participants[sameNameIdx] = obj;
          added++;
        } else {
          skipped++;
        }
      } else {
        participants.push(obj);
        added++;
      }
    });

    saveCache();
    renderAll();
    const type = errors > 0 ? 'warning' : 'success';
    showToast(`${added} agregado(s) · ${skipped} duplicado(s) · ${errors} error(es)`, type);
  }

  function readFileAsJSON(file) {
    return new Promise((resolve, reject) => {
      if (!file.name.endsWith('.json')) {
        reject(new Error(`${file.name} no es un JSON`));
        return;
      }
      const reader = new FileReader();
      reader.onload  = (e) => {
        try { resolve(JSON.parse(e.target.result)); }
        catch { reject(new Error(`JSON inválido: ${file.name}`)); }
      };
      reader.onerror = () => reject(new Error(`Error leyendo ${file.name}`));
      reader.readAsText(file);
    });
  }

  function validateSchema(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (!obj.nombre || !obj.timestamp || !obj.predicciones) return false;
    const pred = obj.predicciones;
    if (!pred.grupos || !pred.panama) return false;
    return true;
  }

  // ─── Puntuación ───────────────────────────────────────────
  function scoreParticipant(pred) {
    const results = getResults();
    const s = WC2026.scoring;
    const breakdown = {
      grupos: 0, terceros: 0,
      campeon: 0, subcampeon: 0, goleador: 0, balonDeOro: 0,
      panama: 0, specials: 0, extras: 0,
    };

    if (!results) return { total: 0, breakdown };

    // Grupos
    Object.keys(WC2026.groups).forEach(grpId => {
      const u = pred.grupos?.[grpId];
      const r = results.grupos?.[grpId];
      if (!u || !r) return;
      if (u.primero && u.primero === r.primero) breakdown.grupos += s.grupoPosicionCorrecta;
      if (u.segundo && u.segundo === r.segundo) breakdown.grupos += s.grupoPosicionCorrecta;
    });

    // Mejores terceros
    if (results.mejoresTerceros && Array.isArray(pred.mejoresTerceros)) {
      pred.mejoresTerceros.forEach(team => {
        if (results.mejoresTerceros.includes(team)) breakdown.terceros += s.terceroPasa;
      });
    }

    // Campeón y subcampeón
    if (pred.campeon    && pred.campeon    === results.campeon)    breakdown.campeon    = s.campeon;
    if (pred.subcampeon && pred.subcampeon === results.subcampeon) breakdown.subcampeon = s.subcampeon;

    // Bota de Oro
    if (pred.goleador && results.goleador &&
        pred.goleador.trim().toLowerCase() === results.goleador.trim().toLowerCase())
      breakdown.goleador = s.goleador;

    // Balón de Oro
    if (pred.balonDeOro && results.balonDeOro &&
        pred.balonDeOro.trim().toLowerCase() === results.balonDeOro.trim().toLowerCase())
      breakdown.balonDeOro = s.balonDeOro;

    // Panamá
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

    // Partidos especiales
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

    // Extras
    const ex  = pred.extras || {};
    const rex = results.extras || {};
    if (Object.keys(rex).length) {
      const cmpStr = (a, b) => a && b && String(a).trim() === String(b).trim();
      const cmpNum = (a, b) => a !== null && a !== '' && b !== null && Number(a) === Number(b);

      if (cmpStr(ex.primerGoleadorPanama, rex.primerGoleadorPanama)) breakdown.extras += s.extra;
      if (cmpNum(ex.golesYamal,           rex.golesYamal))           breakdown.extras += s.extra;
      if (cmpNum(ex.golesVinicius,        rex.golesVinicius))        breakdown.extras += s.extra;
      if (cmpNum(ex.golesEnFinal,         rex.golesEnFinal))         breakdown.extras += s.extra;
      if (cmpStr(ex.argentinaSemis,       rex.argentinaSemis))       breakdown.extras += s.extra;
      if (cmpStr(ex.masGolesCR7Messi,     rex.masGolesCR7Messi))     breakdown.extras += s.extra;
      if (cmpStr(ex.equipoMasGoles,       rex.equipoMasGoles))       breakdown.extras += s.extra;
      if (cmpStr(ex.equipoMasGoleado,     rex.equipoMasGoleado))     breakdown.extras += s.extra;
      if (cmpNum(ex.mayorGoleada,         rex.mayorGoleada))         breakdown.extras += s.extra;
      if (cmpStr(ex.españaCuartos,        rex.españaCuartos))        breakdown.extras += s.extra;
      if (cmpStr(ex.concacafOctavos,      rex.concacafOctavos))      breakdown.extras += s.extra;
    }

    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
    return { total, breakdown };
  }

  // ─── Render All ───────────────────────────────────────────
  function renderAll() {
    updateStats();
    renderTable();
    // Refresh selecciones tab if it's visible
    const selTab = document.getElementById('tab-selecciones');
    if (selTab && selTab.classList.contains('active')) renderSeleccionesTab();
  }

  function updateStats() {
    const el = document.getElementById('stat-count');
    if (el) el.textContent = participants.length;
    const banner = document.getElementById('no-results-banner');
    if (banner) banner.style.display = getResults() ? 'none' : 'flex';
  }

  function renderTable() {
    const container = document.getElementById('table-container');
    if (!container) return;

    if (participants.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fa-solid fa-users"></i></div>
          <p>Ningún archivo cargado todavía.</p>
          <p>Sube los JSON de tus compañeros para ver el ranking.</p>
        </div>`;
      return;
    }

    const scored = participants.map(p => ({
      ...p,
      score: scoreParticipant(p.predicciones),
    }));

    scored.sort((a, b) => {
      let va, vb;
      if (sortKey === 'nombre')       { va = a.nombre;                    vb = b.nombre; }
      else if (sortKey === 'grupos')  { va = a.score.breakdown.grupos;    vb = b.score.breakdown.grupos; }
      else if (sortKey === 'panama')  { va = a.score.breakdown.panama;    vb = b.score.breakdown.panama; }
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
      { key: 'rank',    label: '#',            title: 'Posición en el ranking' },
      { key: 'nombre',  label: 'Participante',  title: 'Nombre' },
      { key: 'total',   label: 'Total',         title: 'Puntos totales' },
      { key: 'grupos',  label: 'Grupos',        title: 'Puntos de grupos' },
      { key: 'panama',  label: 'Panamá',        title: 'Puntos Especial Panamá' },
      { key: 'campeon', label: 'Campeón',       title: 'Equipo campeón elegido' },
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
        if (sortKey === h.key) {
          sortDir = sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          sortKey = h.key;
          sortDir = (h.key === 'nombre' || h.key === 'campeon') ? 'asc' : 'desc';
        }
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
        <span>vs ${m.rival}</span>
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
      { label: '1er gol Panamá',      val: ex.primerGoleadorPanama, real: rex.primerGoleadorPanama, type: 'str' },
      { label: 'Goles Yamal',         val: ex.golesYamal,           real: rex.golesYamal,           type: 'num' },
      { label: 'Goles Vinicius',      val: ex.golesVinicius,        real: rex.golesVinicius,        type: 'num' },
      { label: 'Goles en Final',      val: ex.golesEnFinal,         real: rex.golesEnFinal,         type: 'num' },
      { label: 'Argentina semis',     val: ex.argentinaSemis,       real: rex.argentinaSemis,       type: 'str' },
      { label: 'CR7 vs Messi',        val: ex.masGolesCR7Messi,     real: rex.masGolesCR7Messi,     type: 'str' },
      { label: 'Más goles',           val: ex.equipoMasGoles,       real: rex.equipoMasGoles,       type: 'str' },
      { label: 'Más goleado',         val: ex.equipoMasGoleado,     real: rex.equipoMasGoleado,     type: 'str' },
      { label: 'Mayor goleada',       val: ex.mayorGoleada,         real: rex.mayorGoleada,         type: 'num' },
      { label: 'España cuartos',      val: ex.españaCuartos,        real: rex.españaCuartos,        type: 'str' },
      { label: 'CONCACAF octavos',    val: ex.concacafOctavos,      real: rex.concacafOctavos,      type: 'str' },
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
              <p>Ningún participante cargado todavía.</p>
              <p>Ve a la pestaña <strong>Ranking</strong> y sube los archivos JSON.</p>
            </div>
          </div>
        </section>`;
      return;
    }

    // Score and rank participants
    const scored = participants.map(p => ({
      ...p,
      score: scoreParticipant(p.predicciones),
    })).sort((a, b) => b.score.total - a.score.total);

    // Assign ranks
    scored.forEach((p, i) => {
      const prev = i > 0 ? scored[i - 1].score.total : null;
      p._rank = (prev !== null && prev === p.score.total) ? scored[i - 1]._rank : i + 1;
    });

    let cardsHtml = scored.map(p => {
      const pred = p.predicciones;
      const rank = p._rank;
      const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';

      // Panama picks
      const panPicks = WC2026.panamaMatches.map(m => {
        const u = pred.panama?.[m.key];
        const score = (u?.golesPanama !== '' && u?.golesPanama !== undefined && u?.golesRival !== undefined)
          ? `${u.golesPanama}–${u.golesRival}` : '?–?';
        return `<span class="sel-pan-item">vs ${escapeHtml(m.rival)}: <strong>${score}</strong></span>`;
      }).join('');

      const champHtml = pred.campeon ? teamWithFlag(pred.campeon) : '<span style="color:var(--label-4)">—</span>';
      const subHtml   = pred.subcampeon ? teamWithFlag(pred.subcampeon) : '<span style="color:var(--label-4)">—</span>';
      const goleHtml  = pred.goleador ? escapeHtml(pred.goleador) : '—';

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

  // ─── Tab: Resultados — Form Build ────────────────────────
  function buildResultsForm() {
    const container = document.getElementById('resultados-container');
    if (!container) return;

    // Ensure localResults has a full skeleton
    if (!localResults) localResults = {};
    ensureResultsSkeleton();

    const allTeams = getAllTeams();

    // ── Grupos section ──────────────────────────────────────
    let gruposHtml = '';
    Object.keys(WC2026.groups).forEach(grpId => {
      const teams = WC2026.groups[grpId].teams;
      const rGrp  = localResults.grupos[grpId] || {};
      const optsPrimero = teams.map(t =>
        `<option value="${escapeHtml(t)}" ${rGrp.primero === t ? 'selected' : ''}>${escapeHtml(t)}</option>`
      ).join('');
      const optsSeg = teams.map(t =>
        `<option value="${escapeHtml(t)}" ${rGrp.segundo === t ? 'selected' : ''}>${escapeHtml(t)}</option>`
      ).join('');

      gruposHtml += `
        <div class="res-group-card">
          <div class="res-group-label">Grupo ${grpId}</div>
          <div class="res-group-picks">
            ${teams.map(t => `
              <div class="res-group-team">
                <span class="fi fi-${WC2026.countryCodes?.[t] || 'un'}" style="border-radius:2px"></span>
                <span class="res-group-team-name">${escapeHtml(t)}</span>
              </div>`).join('')}
            <div class="res-pick-row">
              <span class="res-pick-pos">1°</span>
              <select class="res-select" data-result="grupo" data-group="${grpId}" data-pos="primero">
                <option value="">— selecciona —</option>
                ${optsPrimero}
              </select>
            </div>
            <div class="res-pick-row">
              <span class="res-pick-pos" style="background:rgba(120,120,128,0.18);color:var(--label-3)">2°</span>
              <select class="res-select" data-result="grupo" data-group="${grpId}" data-pos="segundo">
                <option value="">— selecciona —</option>
                ${optsSeg}
              </select>
            </div>
          </div>
        </div>`;
    });

    // ── Terceros section ────────────────────────────────────
    // Collect all teams that ARE 1° or 2° in localResults to dim them
    const terceroSelected = localResults.mejoresTerceros || [];
    let tercerosHtml = buildTercerosHtml(terceroSelected);

    // ── Panamá matches ──────────────────────────────────────
    let panamaHtml = '';
    WC2026.panamaMatches.forEach(m => {
      const rPan = localResults.panama?.[m.key] || {};
      panamaHtml += `
        <div class="panama-match-card">
          <div class="panama-match-header">
            <span class="fi fi-pa"></span>
            Panamá vs ${escapeHtml(m.rival)}
            <span class="fi fi-${WC2026.countryCodes?.[m.rival] || 'un'}"></span>
          </div>
          <div class="panama-score">
            <div class="panama-team">
              <div class="panama-flag-big"><span class="fi fi-pa"></span></div>
              <div class="panama-team-name">Panamá</div>
            </div>
            <input type="number" class="score-input" min="0" max="30" placeholder="–"
              data-result="panama" data-key="${m.key}" data-side="golesPanama"
              value="${rPan.golesPanama !== undefined ? rPan.golesPanama : ''}">
            <span class="score-dash">–</span>
            <input type="number" class="score-input" min="0" max="30" placeholder="–"
              data-result="panama" data-key="${m.key}" data-side="golesRival"
              value="${rPan.golesRival !== undefined ? rPan.golesRival : ''}">
            <div class="panama-team">
              <div class="panama-flag-big"><span class="fi fi-${WC2026.countryCodes?.[m.rival] || 'un'}"></span></div>
              <div class="panama-team-name">${escapeHtml(m.rival)}</div>
            </div>
          </div>
        </div>`;
    });

    // ── Special matches ─────────────────────────────────────
    let specialsHtml = '';
    WC2026.specialMatches.forEach(m => {
      const rSp = localResults.specials?.[m.key] || {};
      const badgeHtml = m.badge ? `<span class="special-badge">${escapeHtml(m.badge)}</span>` : '';
      specialsHtml += `
        <div class="panama-match-card special-match-card">
          <div class="panama-match-header">
            <span class="fi fi-${WC2026.countryCodes?.[m.team1] || 'un'}"></span>
            ${escapeHtml(m.team1)} vs ${escapeHtml(m.team2)}
            <span class="fi fi-${WC2026.countryCodes?.[m.team2] || 'un'}"></span>
            ${badgeHtml}
          </div>
          <div class="panama-score">
            <div class="panama-team">
              <div class="panama-flag-big"><span class="fi fi-${WC2026.countryCodes?.[m.team1] || 'un'}"></span></div>
              <div class="panama-team-name">${escapeHtml(m.team1)}</div>
            </div>
            <input type="number" class="score-input special-score" min="0" max="30" placeholder="–"
              data-result="special" data-key="${m.key}" data-side="golesTeam1"
              value="${rSp.golesTeam1 !== undefined ? rSp.golesTeam1 : ''}">
            <span class="score-dash">–</span>
            <input type="number" class="score-input special-score" min="0" max="30" placeholder="–"
              data-result="special" data-key="${m.key}" data-side="golesTeam2"
              value="${rSp.golesTeam2 !== undefined ? rSp.golesTeam2 : ''}">
            <div class="panama-team">
              <div class="panama-flag-big"><span class="fi fi-${WC2026.countryCodes?.[m.team2] || 'un'}"></span></div>
              <div class="panama-team-name">${escapeHtml(m.team2)}</div>
            </div>
          </div>
        </div>`;
    });

    // ── Predicciones Especiales ─────────────────────────────
    const rCamp  = localResults.campeon    || '';
    const rSub   = localResults.subcampeon || '';
    const rGol   = localResults.goleador   || '';
    const rBalon = localResults.balonDeOro || '';

    const teamOpts = ['', ...allTeams].map(t =>
      `<option value="${escapeHtml(t)}" ${(t && (t === rCamp || t === rSub)) ? '' : ''}>${t ? escapeHtml(t) : '— selecciona —'}</option>`
    );
    const campOpts   = allTeams.map(t => `<option value="${escapeHtml(t)}" ${t === rCamp  ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('');
    const subOpts    = allTeams.map(t => `<option value="${escapeHtml(t)}" ${t === rSub   ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('');
    const golOpts    = WC2026.goleadores.map(g  => `<option value="${escapeHtml(g)}"  ${g === rGol   ? 'selected' : ''}>${escapeHtml(g)}</option>`).join('');
    const balonOpts  = WC2026.balonDeOroCandidates.map(g => `<option value="${escapeHtml(g)}" ${g === rBalon ? 'selected' : ''}>${escapeHtml(g)}</option>`).join('');

    let predEspHtml = `
      <div class="pred-grid-4">
        <div class="pred-card">
          <div class="pred-card-icon"><i class="fa-solid fa-trophy" style="color:var(--orange)"></i></div>
          <div class="pred-card-title">Campeón</div>
          <div class="pred-card-sub">Ganador del Mundial</div>
          <select class="special-select" data-result="campeon">
            <option value="">— selecciona —</option>
            ${campOpts}
          </select>
        </div>
        <div class="pred-card">
          <div class="pred-card-icon"><i class="fa-solid fa-medal" style="color:var(--label-3)"></i></div>
          <div class="pred-card-title">Subcampeón</div>
          <div class="pred-card-sub">Finalista perdedor</div>
          <select class="special-select" data-result="subcampeon">
            <option value="">— selecciona —</option>
            ${subOpts}
          </select>
        </div>
        <div class="pred-card">
          <div class="pred-card-icon"><i class="fa-solid fa-shoe-prints" style="color:var(--green)"></i></div>
          <div class="pred-card-title">Bota de Oro</div>
          <div class="pred-card-sub">Máximo goleador</div>
          <select class="special-select" data-result="goleador">
            <option value="">— selecciona —</option>
            ${golOpts}
          </select>
        </div>
        <div class="pred-card">
          <div class="pred-card-icon"><i class="fa-solid fa-futbol" style="color:var(--blue)"></i></div>
          <div class="pred-card-title">Balón de Oro</div>
          <div class="pred-card-sub">Mejor jugador</div>
          <select class="special-select" data-result="balonDeOro">
            <option value="">— selecciona —</option>
            ${balonOpts}
          </select>
        </div>
      </div>`;

    // ── Extras ──────────────────────────────────────────────
    const rex = localResults.extras || {};
    const panamaPlayerOpts = WC2026.panamaPlayers.map(pl =>
      `<option value="${escapeHtml(pl)}" ${pl === rex.primerGoleadorPanama ? 'selected' : ''}>${escapeHtml(pl)}</option>`
    ).join('');
    const equipoMasGolesOpts = allTeams.map(t =>
      `<option value="${escapeHtml(t)}" ${t === rex.equipoMasGoles ? 'selected' : ''}>${escapeHtml(t)}</option>`
    ).join('');
    const equipoMasGoleadoOpts = allTeams.map(t =>
      `<option value="${escapeHtml(t)}" ${t === rex.equipoMasGoleado ? 'selected' : ''}>${escapeHtml(t)}</option>`
    ).join('');

    function yesNoBtn(key) {
      const si = rex[key] === 'si';
      const no = rex[key] === 'no';
      return `
        <div class="toggle-group" style="margin-top:0">
          <button type="button" class="toggle-btn toggle-si ${si ? 'selected' : ''}"
            data-result="extra-toggle" data-key="${key}" data-val="si">Sí</button>
          <button type="button" class="toggle-btn toggle-no ${no ? 'selected' : ''}"
            data-result="extra-toggle" data-key="${key}" data-val="no">No</button>
        </div>`;
    }

    function cr7MessiBtn() {
      const cr7   = rex.masGolesCR7Messi === 'cr7';
      const igual = rex.masGolesCR7Messi === 'igual';
      const messi = rex.masGolesCR7Messi === 'messi';
      return `
        <div class="toggle-group" style="margin-top:0">
          <button type="button" class="toggle-btn toggle-cr7   ${cr7   ? 'selected' : ''}"
            data-result="extra-toggle" data-key="masGolesCR7Messi" data-val="cr7">CR7</button>
          <button type="button" class="toggle-btn toggle-igual ${igual ? 'selected' : ''}"
            data-result="extra-toggle" data-key="masGolesCR7Messi" data-val="igual">Igual</button>
          <button type="button" class="toggle-btn toggle-messi ${messi ? 'selected' : ''}"
            data-result="extra-toggle" data-key="masGolesCR7Messi" data-val="messi">Messi</button>
        </div>`;
    }

    let extrasHtml = `
      <div class="res-extras-grid">
        <div class="res-extra-row">
          <span class="res-extra-label">1er Goleador de Panamá</span>
          <select class="special-select res-extra-select" data-result="extra" data-key="primerGoleadorPanama">
            <option value="">— selecciona —</option>
            ${panamaPlayerOpts}
          </select>
        </div>
        <div class="res-extra-row">
          <span class="res-extra-label">Goles de Yamal</span>
          <input type="number" class="res-number-input" min="0" max="30"
            data-result="extra" data-key="golesYamal"
            value="${rex.golesYamal !== undefined && rex.golesYamal !== null ? rex.golesYamal : ''}"
            placeholder="0">
        </div>
        <div class="res-extra-row">
          <span class="res-extra-label">Goles de Vinicius</span>
          <input type="number" class="res-number-input" min="0" max="30"
            data-result="extra" data-key="golesVinicius"
            value="${rex.golesVinicius !== undefined && rex.golesVinicius !== null ? rex.golesVinicius : ''}"
            placeholder="0">
        </div>
        <div class="res-extra-row">
          <span class="res-extra-label">Goles en la Final</span>
          <input type="number" class="res-number-input" min="0" max="30"
            data-result="extra" data-key="golesEnFinal"
            value="${rex.golesEnFinal !== undefined && rex.golesEnFinal !== null ? rex.golesEnFinal : ''}"
            placeholder="0">
        </div>
        <div class="res-extra-row">
          <span class="res-extra-label">¿Argentina llega a semifinales?</span>
          <div>${yesNoBtn('argentinaSemis')}</div>
        </div>
        <div class="res-extra-row">
          <span class="res-extra-label">¿España llega a cuartos?</span>
          <div>${yesNoBtn('españaCuartos')}</div>
        </div>
        <div class="res-extra-row">
          <span class="res-extra-label">¿Un equipo CONCACAF en octavos?</span>
          <div>${yesNoBtn('concacafOctavos')}</div>
        </div>
        <div class="res-extra-row">
          <span class="res-extra-label">¿Quién anota más: CR7 o Messi?</span>
          <div>${cr7MessiBtn()}</div>
        </div>
        <div class="res-extra-row">
          <span class="res-extra-label">Equipo con más goles</span>
          <select class="special-select res-extra-select" data-result="extra" data-key="equipoMasGoles">
            <option value="">— selecciona —</option>
            ${equipoMasGolesOpts}
          </select>
        </div>
        <div class="res-extra-row">
          <span class="res-extra-label">Equipo más goleado</span>
          <select class="special-select res-extra-select" data-result="extra" data-key="equipoMasGoleado">
            <option value="">— selecciona —</option>
            ${equipoMasGoleadoOpts}
          </select>
        </div>
        <div class="res-extra-row">
          <span class="res-extra-label">Mayor goleada (diferencia)</span>
          <input type="number" class="res-number-input" min="1" max="20"
            data-result="extra" data-key="mayorGoleada"
            value="${rex.mayorGoleada !== undefined && rex.mayorGoleada !== null ? rex.mayorGoleada : ''}"
            placeholder="0">
        </div>
      </div>`;

    // ── Full form render ─────────────────────────────────────
    container.innerHTML = `
      ${buildResSection('fa-layer-group', 'Fase de Grupos', 'Primero y segundo de cada grupo',
        `<div class="res-groups-grid">${gruposHtml}</div>`)}

      ${buildResSection('fa-medal', 'Mejores Terceros', 'Selecciona los 8 equipos que pasan como mejores terceros',
        `<div id="res-terceros-wrap">${tercerosHtml}</div>`)}

      ${buildResSection('fi fi-pa', 'Especial Panamá', 'Marcadores reales de los partidos de Panamá',
        `<div class="panama-matches">${panamaHtml}</div>`, true)}

      ${buildResSection('fa-star', 'Partidos Destacados', 'Marcadores reales de los partidos especiales',
        `<div class="panama-matches">${specialsHtml}</div>`)}

      ${buildResSection('fa-trophy', 'Predicciones Especiales', 'Campeón, subcampeón, goleador y balón de oro',
        predEspHtml)}

      ${buildResSection('fa-wand-magic-sparkles', 'Extras', 'Predicciones especiales adicionales',
        extrasHtml)}

      <div style="padding:8px 0 4px;text-align:right">
        <span id="res-saved-chip" class="res-saved-chip" style="display:none">
          <i class="fa-solid fa-check"></i> Guardado
        </span>
      </div>
    `;

    // Attach event listeners
    container.addEventListener('change', handleResultsChange);
    container.addEventListener('input',  handleResultsChange);
    container.addEventListener('click',  handleResultsClick);

    // Collapsible sections
    container.querySelectorAll('.section-header[data-collapsible]').forEach(hdr => {
      hdr.addEventListener('click', () => {
        const body    = hdr.nextElementSibling;
        const chevron = hdr.querySelector('.section-chevron');
        body.classList.toggle('is-collapsed');
        if (chevron) chevron.classList.toggle('chevron-closed');
      });
    });
  }

  function buildResSection(iconClass, title, sub, bodyHtml, isFlagIcon = false) {
    const iconHtml = isFlagIcon
      ? `<span class="section-icon"><span class="fi ${iconClass}" style="font-size:1.1rem"></span></span>`
      : `<span class="section-icon"><i class="fa-solid ${iconClass}"></i></span>`;
    return `
      <section class="form-section">
        <div class="section-header" data-collapsible>
          ${iconHtml}
          <div class="section-header-text">
            <h2>${escapeHtml(title)}</h2>
            <div class="section-sub">${escapeHtml(sub)}</div>
          </div>
          <i class="fa-solid fa-chevron-down section-chevron"></i>
        </div>
        <div class="section-body">
          ${bodyHtml}
        </div>
      </section>`;
  }

  function buildTercerosHtml(selected) {
    // Get teams already picked as 1° or 2° in groups results
    const dimmed = new Set();
    if (localResults && localResults.grupos) {
      Object.values(localResults.grupos).forEach(g => {
        if (g.primero) dimmed.add(g.primero);
        if (g.segundo) dimmed.add(g.segundo);
      });
    }

    const count = selected.length;
    const counterClass = count === 8 ? 'complete' : count > 8 ? 'over' : '';

    let html = `
      <div class="terceros-info">
        Selecciona exactamente 8 equipos que pasen como mejores terceros.
        <span class="terceros-counter ${counterClass}" style="margin-left:6px">
          ${count}/8 seleccionados
        </span>
      </div>
      <div class="res-terceros-grid">`;

    // Group chips by group
    Object.keys(WC2026.groups).forEach(grpId => {
      const teams = WC2026.groups[grpId].teams;
      html += `
        <div class="tercero-group-card">
          <div class="tercero-group-header">
            <div class="tercero-group-label">Grupo ${grpId}</div>
          </div>
          <div class="tercero-team-list">`;
      teams.forEach(team => {
        const isSel    = selected.includes(team);
        const isDimmed = dimmed.has(team) && !isSel;
        html += `
            <button type="button"
              class="tercero-chip res-tercero-chip ${isSel ? 'selected' : ''} ${isDimmed ? 'dimmed' : ''}"
              data-result="tercero" data-team="${escapeHtml(team)}">
              <span class="tercero-chip-flag"><span class="fi fi-${WC2026.countryCodes?.[team] || 'un'}"></span></span>
              <span class="tercero-chip-name">${escapeHtml(team)}</span>
              ${isSel ? '<i class="fa-solid fa-check tercero-chip-check"></i>' : ''}
            </button>`;
      });
      html += `</div></div>`;
    });

    html += `</div>`;
    return html;
  }

  // ─── Results form event handlers ─────────────────────────
  function handleResultsChange(e) {
    const el = e.target;
    const type = el.dataset.result;
    if (!type) return;

    // Ignore toggle buttons (handled by click)
    if (type === 'extra-toggle') return;

    ensureResultsSkeleton();

    if (type === 'grupo') {
      const grp = el.dataset.group;
      const pos = el.dataset.pos; // "primero" | "segundo"
      if (!localResults.grupos[grp]) localResults.grupos[grp] = {};
      localResults.grupos[grp][pos] = el.value || null;

      // Refresh terceros to update dimmed state
      const wrap = document.getElementById('res-terceros-wrap');
      if (wrap) wrap.innerHTML = buildTercerosHtml(localResults.mejoresTerceros || []);

    } else if (type === 'panama') {
      const key  = el.dataset.key;
      const side = el.dataset.side;
      if (!localResults.panama[key]) localResults.panama[key] = {};
      localResults.panama[key][side] = el.value !== '' ? parseInt(el.value) : null;

    } else if (type === 'special') {
      const key  = el.dataset.key;
      const side = el.dataset.side;
      if (!localResults.specials[key]) localResults.specials[key] = {};
      localResults.specials[key][side] = el.value !== '' ? parseInt(el.value) : null;

    } else if (type === 'campeon') {
      localResults.campeon = el.value || null;
    } else if (type === 'subcampeon') {
      localResults.subcampeon = el.value || null;
    } else if (type === 'goleador') {
      localResults.goleador = el.value || null;
    } else if (type === 'balonDeOro') {
      localResults.balonDeOro = el.value || null;
    } else if (type === 'extra') {
      const key = el.dataset.key;
      const numKeys = ['golesYamal', 'golesVinicius', 'golesEnFinal', 'mayorGoleada'];
      if (numKeys.includes(key)) {
        localResults.extras[key] = el.value !== '' ? parseInt(el.value) : null;
      } else {
        localResults.extras[key] = el.value || null;
      }
    }

    saveLocalResults();
    renderAll();
    showSavedChip();
  }

  function handleResultsClick(e) {
    // Toggle buttons
    const toggleBtn = e.target.closest('[data-result="extra-toggle"]');
    if (toggleBtn) {
      const key = toggleBtn.dataset.key;
      const val = toggleBtn.dataset.val;
      ensureResultsSkeleton();
      localResults.extras[key] = val;

      // Update button states within the same group
      const group = toggleBtn.closest('.toggle-group');
      if (group) {
        group.querySelectorAll('.toggle-btn').forEach(b => {
          b.classList.toggle('selected', b.dataset.val === val);
        });
      }

      saveLocalResults();
      renderAll();
      showSavedChip();
      return;
    }

    // Tercero chips
    const chip = e.target.closest('.res-tercero-chip');
    if (chip) {
      const team = chip.dataset.team;
      if (!team) return;
      ensureResultsSkeleton();
      const arr = localResults.mejoresTerceros;
      const idx = arr.indexOf(team);
      if (idx >= 0) {
        arr.splice(idx, 1);
      } else {
        if (arr.length >= 8) {
          showToast('Ya seleccionaste 8 equipos terceros', 'warning');
          return;
        }
        arr.push(team);
      }

      // Re-render terceros section only
      const wrap = document.getElementById('res-terceros-wrap');
      if (wrap) wrap.innerHTML = buildTercerosHtml(arr);

      saveLocalResults();
      renderAll();
      showSavedChip();
    }
  }

  function ensureResultsSkeleton() {
    if (!localResults) localResults = {};
    if (!localResults.grupos) {
      localResults.grupos = {};
      Object.keys(WC2026.groups).forEach(g => { localResults.grupos[g] = {}; });
    }
    if (!localResults.mejoresTerceros) localResults.mejoresTerceros = [];
    if (!localResults.panama) {
      localResults.panama = {};
      WC2026.panamaMatches.forEach(m => { localResults.panama[m.key] = {}; });
    }
    if (!localResults.specials) {
      localResults.specials = {};
      WC2026.specialMatches.forEach(m => { localResults.specials[m.key] = {}; });
    }
    if (!localResults.extras) localResults.extras = {};
    if (!localResults.campeon)    localResults.campeon    = null;
    if (!localResults.subcampeon) localResults.subcampeon = null;
    if (!localResults.goleador)   localResults.goleador   = null;
    if (!localResults.balonDeOro) localResults.balonDeOro = null;
  }

  function showSavedChip() {
    const chip = document.getElementById('res-saved-chip');
    if (!chip) return;
    chip.style.display = 'inline-flex';
    chip.style.opacity = '1';
    clearTimeout(chip._timer);
    chip._timer = setTimeout(() => {
      chip.style.opacity = '0';
      setTimeout(() => { chip.style.display = 'none'; }, 400);
    }, 2000);
  }

  // ─── Helpers ──────────────────────────────────────────────
  function getAllTeams() {
    const teams = [];
    Object.values(WC2026.groups).forEach(g => g.teams.forEach(t => teams.push(t)));
    return teams.sort((a, b) => a.localeCompare(b));
  }

  // ─── Toast ────────────────────────────────────────────────
  function showToast(msg, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast';
      toast.style.cssText = `
        position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
        padding:10px 22px; border-radius:20px; font-size:0.87rem; font-weight:600;
        z-index:9999; box-shadow:0 4px 16px rgba(0,0,0,0.2);
        transition:opacity 0.3s; pointer-events:none;
      `;
      document.body.appendChild(toast);
    }
    const colors = {
      success: { bg: '#059669', color: '#fff' },
      error:   { bg: '#dc2626', color: '#fff' },
      warning: { bg: '#d97706', color: '#fff' },
      info:    { bg: '#3b5bdb', color: '#fff' },
    };
    const c = colors[type] || colors.info;
    toast.style.background = c.bg;
    toast.style.color = c.color;
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 4000);
  }

  // ─── Utilidades ───────────────────────────────────────────
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
    loadLocalResults();
    initLogin();
    initTabs();
    initUpload();
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', AdminApp.init);
