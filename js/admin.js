// ============================================================
// admin.js — Panel de Administración · Polla Mundialista 2026
// ============================================================

const AdminApp = (function () {

  const LS_CACHE = 'polla2026_admin_cache';

  let participants = []; // array de objetos exportados
  let sortKey = 'rank';
  let sortDir = 'asc';

  // ─── Login ────────────────────────────────────────────────
  function initLogin() {
    const form = document.getElementById('login-form');
    const input = document.getElementById('pwd-input');
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

  // ─── Cargar caché ─────────────────────────────────────────
  function loadCachedParticipants() {
    try {
      const raw = localStorage.getItem(LS_CACHE);
      if (raw) {
        participants = JSON.parse(raw);
        renderAll();
      }
    } catch (e) {
      console.error('Error cargando caché admin', e);
    }
  }

  function saveCache() {
    try {
      localStorage.setItem(LS_CACHE, JSON.stringify(participants));
    } catch (e) { /* quota */ }
  }

  // ─── Subida de archivos ───────────────────────────────────
  function initUpload() {
    const zone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    if (!zone || !fileInput) return;

    zone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) handleFiles(e.target.files);
      fileInput.value = '';
    });

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });

    // Botón limpiar
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

    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        errors++;
        return;
      }
      const obj = r.value;
      if (!validateSchema(obj)) {
        skipped++;
        return;
      }
      // Deduplicar: si existe mismo nombre+timestamp, ignorar
      const key = `${obj.nombre}_${obj.timestamp}`;
      const existIdx = participants.findIndex(
        p => `${p.nombre}_${p.timestamp}` === key
      );
      if (existIdx >= 0) {
        skipped++;
        return;
      }
      // Si mismo nombre pero diferente timestamp → reemplazar con el más nuevo
      const sameNameIdx = participants.findIndex(p => p.nombre === obj.nombre);
      if (sameNameIdx >= 0) {
        const existing = participants[sameNameIdx];
        if (new Date(obj.timestamp) > new Date(existing.timestamp)) {
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
    showToast(`${added} agregado(s), ${skipped} duplicado(s), ${errors} error(es).`,
      errors > 0 ? 'warning' : 'success');
  }

  function readFileAsJSON(file) {
    return new Promise((resolve, reject) => {
      if (!file.name.endsWith('.json')) {
        reject(new Error(`${file.name} no es un JSON`));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          resolve(JSON.parse(e.target.result));
        } catch {
          reject(new Error(`JSON inválido: ${file.name}`));
        }
      };
      reader.onerror = () => reject(new Error(`Error leyendo ${file.name}`));
      reader.readAsText(file);
    });
  }

  function validateSchema(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (!obj.nombre || !obj.timestamp || !obj.predicciones) return false;
    const pred = obj.predicciones;
    if (!pred.grupos || !pred.knockout) return false;
    return true;
  }

  // ─── Puntuación ───────────────────────────────────────────
  function scoreParticipant(pred) {
    const results = WC2026.RESULTS;
    const s = WC2026.scoring;
    const breakdown = {
      grupos: 0, terceros: 0,
      r32: 0, r16: 0, qf: 0, sf: 0, bronze: 0, final: 0,
      campeon: 0, subcampeon: 0, goleador: 0, panama: 0,
    };

    if (!results) return { total: 0, breakdown };

    // Grupos
    Object.keys(WC2026.groups).forEach(grpId => {
      const userPick = pred.grupos?.[grpId];
      const realResult = results.grupos?.[grpId];
      if (!userPick || !realResult) return;

      if (userPick.primero && realResult.primero) {
        if (userPick.primero === realResult.primero) {
          breakdown.grupos += s.grupoPasa + s.grupoPosicionCorrecta;
        } else if (userPick.primero === realResult.segundo) {
          breakdown.grupos += s.grupoPasa;
        }
      }
      if (userPick.segundo && realResult.segundo) {
        if (userPick.segundo === realResult.segundo) {
          breakdown.grupos += s.grupoPasa + s.grupoPosicionCorrecta;
        } else if (userPick.segundo === realResult.primero) {
          breakdown.grupos += s.grupoPasa;
        }
      }
    });

    // Mejores terceros
    if (results.mejoresTerceros && Array.isArray(pred.mejoresTerceros)) {
      pred.mejoresTerceros.forEach(team => {
        if (results.mejoresTerceros.includes(team)) {
          breakdown.terceros += s.terceroPasa;
        }
      });
    }

    // Knockout
    const roundMap = {
      r32: WC2026.r32Bracket.map(m => m.matchId),
      r16: WC2026.r16Bracket.map(m => m.matchId),
      qf:  WC2026.qfBracket.map(m => m.matchId),
      sf:  WC2026.sfBracket.map(m => m.matchId),
      bronze: ['BRONZE'],
      final:  ['FINAL'],
    };
    Object.entries(roundMap).forEach(([roundKey, matchIds]) => {
      matchIds.forEach(matchId => {
        const userPick = pred.knockout?.[matchId];
        const realPick = results.knockout?.[matchId];
        if (userPick && realPick && userPick === realPick) {
          breakdown[roundKey] += s[roundKey];
        }
      });
    });

    // Campeón y subcampeón
    if (pred.campeon && pred.campeon === results.campeon)
      breakdown.campeon = s.campeon;
    if (pred.subcampeon && pred.subcampeon === results.subcampeon)
      breakdown.subcampeon = s.subcampeon;

    // Goleador
    if (pred.goleador && results.goleador &&
        pred.goleador.trim().toLowerCase() === results.goleador.trim().toLowerCase())
      breakdown.goleador = s.goleador;

    // Panamá
    WC2026.panamaMatches.forEach(m => {
      const userMatch = pred.panama?.[m.key];
      const realMatch = results.panama?.[m.key];
      if (!userMatch || !realMatch) return;
      const uP = parseInt(userMatch.golesPanama), uR = parseInt(userMatch.golesRival);
      const rP = parseInt(realMatch.golesPanama), rR = parseInt(realMatch.golesRival);
      if (!isNaN(uP) && !isNaN(uR) && !isNaN(rP) && !isNaN(rR)) {
        if (uP === rP && uR === rR) {
          breakdown.panama += s.panamaExacto;
        } else {
          const userResult = uP > uR ? 'W' : uP < uR ? 'L' : 'D';
          const realResult = rP > rR ? 'W' : rP < rR ? 'L' : 'D';
          if (userResult === realResult) breakdown.panama += s.panamaResultado;
        }
      }
    });

    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
    return { total, breakdown };
  }

  // ─── Render tabla ─────────────────────────────────────────
  function renderAll() {
    updateStats();
    renderTable();
  }

  function updateStats() {
    const el = document.getElementById('stat-count');
    if (el) el.textContent = participants.length;
    const noResults = document.getElementById('no-results-banner');
    if (noResults) {
      noResults.style.display = WC2026.RESULTS ? 'none' : 'flex';
    }
  }

  function renderTable() {
    const container = document.getElementById('table-container');
    if (!container) return;

    if (participants.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <p>Ningún archivo cargado todavía.</p>
          <p>Sube los JSON de tus compañeros para ver el ranking.</p>
        </div>`;
      return;
    }

    // Calcular puntos y ordenar
    const scored = participants.map(p => ({
      ...p,
      score: scoreParticipant(p.predicciones),
    }));

    scored.sort((a, b) => {
      let va, vb;
      if (sortKey === 'nombre') { va = a.nombre; vb = b.nombre; }
      else if (sortKey === 'grupos') { va = a.score.breakdown.grupos; vb = b.score.breakdown.grupos; }
      else if (sortKey === 'knockout') {
        va = (a.score.breakdown.r32 + a.score.breakdown.r16 +
              a.score.breakdown.qf  + a.score.breakdown.sf  +
              a.score.breakdown.bronze + a.score.breakdown.final);
        vb = (b.score.breakdown.r32 + b.score.breakdown.r16 +
              b.score.breakdown.qf  + b.score.breakdown.sf  +
              b.score.breakdown.bronze + b.score.breakdown.final);
      }
      else if (sortKey === 'campeon') { va = a.predicciones.campeon; vb = b.predicciones.campeon; }
      else { va = a.score.total; vb = b.score.total; }

      if (typeof va === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === 'asc' ? va - vb : vb - va;
    });

    // Asignar ranks (por total desc)
    const byTotal = [...scored].sort((a, b) => b.score.total - a.score.total);
    const rankMap = {};
    byTotal.forEach((p, i) => {
      const prev = i > 0 ? byTotal[i - 1].score.total : null;
      rankMap[p.nombre + p.timestamp] = (prev === p.score.total && i > 0)
        ? rankMap[byTotal[i - 1].nombre + byTotal[i - 1].timestamp]
        : i + 1;
    });

    // Construir tabla
    const table = document.createElement('table');
    table.className = 'ranking-table';

    const headers = [
      { key: 'rank',     label: '#',          title: 'Ranking' },
      { key: 'nombre',   label: 'Participante', title: 'Nombre' },
      { key: 'total',    label: 'Total',        title: 'Puntos totales' },
      { key: 'grupos',   label: 'Grupos',       title: 'Puntos de grupos' },
      { key: 'knockout', label: 'Elim.',        title: 'Puntos eliminación directa' },
      { key: 'campeon',  label: 'Campeón',      title: 'Equipo campeón elegido' },
    ];

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
          sortDir = h.key === 'nombre' || h.key === 'campeon' ? 'asc' : 'desc';
        }
        renderTable();
      });
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    scored.forEach(p => {
      const key = p.nombre + p.timestamp;
      const rank = rankMap[key];
      const knockoutPts = p.score.breakdown.r32 + p.score.breakdown.r16 +
        p.score.breakdown.qf + p.score.breakdown.sf +
        p.score.breakdown.bronze + p.score.breakdown.final;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="rank-badge ${rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : ''}">${rank}</span></td>
        <td><strong>${escapeHtml(p.nombre)}</strong></td>
        <td><span class="pts-badge">${p.score.total}</span></td>
        <td>${p.score.breakdown.grupos}</td>
        <td>${knockoutPts}</td>
        <td>${p.predicciones.campeon ? teamWithFlag(p.predicciones.campeon) : '—'}</td>
      `;
      tr.addEventListener('click', () => toggleExpandRow(tr, p, rank));
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
  }

  function toggleExpandRow(tr, participant, rank) {
    const existingExpand = tr.nextElementSibling;
    if (existingExpand && existingExpand.classList.contains('expand-row')) {
      existingExpand.remove();
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
    const pred = p.predicciones;
    const results = WC2026.RESULTS;
    const score = scoreParticipant(pred);

    function statusClass(predicted, actual) {
      if (!actual) return 'pick-pending';
      return predicted === actual ? 'pick-correct' : 'pick-wrong';
    }

    // Grupos
    let gruposHtml = `<div class="expand-group"><h4>Fase de Grupos</h4>`;
    Object.keys(WC2026.groups).forEach(grpId => {
      const g = pred.grupos?.[grpId];
      const r = results?.grupos?.[grpId];
      gruposHtml += `<div class="pick-item">
        <span>G${grpId} 1°</span>
        <span class="${statusClass(g?.primero, r?.primero)}">${g?.primero ? teamWithFlag(g.primero) : '—'}</span>
      </div>
      <div class="pick-item">
        <span>G${grpId} 2°</span>
        <span class="${statusClass(g?.segundo, r?.segundo)}">${g?.segundo ? teamWithFlag(g.segundo) : '—'}</span>
      </div>`;
    });
    gruposHtml += `</div>`;

    // Terceros
    let tercerosHtml = `<div class="expand-group"><h4>Mejores Terceros</h4>`;
    (pred.mejoresTerceros || []).forEach(team => {
      const ok = results?.mejoresTerceros?.includes(team);
      tercerosHtml += `<div class="pick-item">
        <span>${teamWithFlag(team)}</span>
        <span class="${results ? (ok ? 'pick-correct' : 'pick-wrong') : 'pick-pending'}">${results ? (ok ? '✓' : '✗') : '?'}</span>
      </div>`;
    });
    tercerosHtml += `</div>`;

    // Knockout resumen
    let knockHtml = `<div class="expand-group"><h4>Eliminación Directa</h4>`;
    const allRounds = [
      { label: 'R32', matches: WC2026.r32Bracket },
      { label: 'R16', matches: WC2026.r16Bracket },
      { label: 'QF',  matches: WC2026.qfBracket  },
      { label: 'SF',  matches: WC2026.sfBracket   },
      { label: 'Bronce', matches: [WC2026.bronzeMatch] },
      { label: 'Final',  matches: [WC2026.finalMatch]  },
    ];
    allRounds.forEach(({ label, matches }) => {
      const correct = matches.filter(m => {
        const u = pred.knockout?.[m.matchId];
        const r = results?.knockout?.[m.matchId];
        return u && r && u === r;
      }).length;
      knockHtml += `<div class="pick-item">
        <span>${label}</span>
        <span class="${results ? (correct > 0 ? 'pick-correct' : 'pick-pending') : 'pick-pending'}">
          ${correct}/${matches.length}
        </span>
      </div>`;
    });
    knockHtml += `</div>`;

    // Especiales
    let specialsHtml = `<div class="expand-group"><h4>Especiales</h4>
      <div class="pick-item"><span>Campeón</span>
        <span class="${statusClass(pred.campeon, results?.campeon)}">${pred.campeon ? teamWithFlag(pred.campeon) : '—'}</span>
      </div>
      <div class="pick-item"><span>Subcampeón</span>
        <span class="${statusClass(pred.subcampeon, results?.subcampeon)}">${pred.subcampeon ? teamWithFlag(pred.subcampeon) : '—'}</span>
      </div>
      <div class="pick-item"><span>Goleador</span>
        <span class="${results ? (pred.goleador?.toLowerCase() === results.goleador?.toLowerCase() ? 'pick-correct' : 'pick-wrong') : 'pick-pending'}">${escapeHtml(pred.goleador || '—')}</span>
      </div>
    </div>`;

    // Panamá
    let panamaHtml = `<div class="expand-group"><h4>🇵🇦 Panamá</h4>`;
    WC2026.panamaMatches.forEach(m => {
      const u = pred.panama?.[m.key];
      const r = results?.panama?.[m.key];
      const uScore = u ? `${u.golesPanama}–${u.golesRival}` : '?–?';
      const rScore = r ? `${r.golesPanama}–${r.golesRival}` : '';
      let cls = 'pick-pending';
      if (r && u) {
        const exact = parseInt(u.golesPanama) === r.golesPanama && parseInt(u.golesRival) === r.golesRival;
        cls = exact ? 'pick-correct' : 'pick-wrong';
      }
      panamaHtml += `<div class="pick-item">
        <span>vs ${m.rival}</span>
        <span class="${cls}">${uScore}${rScore ? ` (real: ${rScore})` : ''}</span>
      </div>`;
    });
    panamaHtml += `</div>`;

    // Puntos breakdown
    let ptsHtml = `<div class="expand-group"><h4>Desglose de Puntos</h4>`;
    const bk = score.breakdown;
    const rows = [
      ['Grupos',        bk.grupos],
      ['3ros',          bk.terceros],
      ['R32',           bk.r32],
      ['R16',           bk.r16],
      ['Cuartos',       bk.qf],
      ['Semifinales',   bk.sf],
      ['Bronce',        bk.bronze],
      ['Final',         bk.final],
      ['Campeón',       bk.campeon],
      ['Subcampeón',    bk.subcampeon],
      ['Goleador',      bk.goleador],
      ['Panamá',        bk.panama],
    ];
    rows.forEach(([label, val]) => {
      ptsHtml += `<div class="pick-item">
        <span>${label}</span>
        <span class="${val > 0 ? 'pick-correct' : 'pick-pending'}">${val} pts</span>
      </div>`;
    });
    ptsHtml += `<div class="pick-item" style="font-weight:700;border-top:2px solid var(--azul);margin-top:4px;padding-top:4px">
      <span>TOTAL</span><span class="pts-badge">${score.total}</span>
    </div></div>`;

    return `<div class="expand-content">
      ${gruposHtml}${tercerosHtml}${knockHtml}${specialsHtml}${panamaHtml}${ptsHtml}
    </div>`;
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
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 4000);
  }

  // ─── Utilidades ───────────────────────────────────────────
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function flagSpan(teamName) {
    const code = WC2026.countryCodes?.[teamName] || 'un';
    return `<span class="fi fi-${code}" style="border-radius:2px;box-shadow:0 1px 3px rgba(0,0,0,0.2);margin-right:4px"></span>`;
  }

  function teamWithFlag(teamName) {
    if (!teamName) return '—';
    return `${flagSpan(teamName)}${escapeHtml(teamName)}`;
  }

  // ─── Init ─────────────────────────────────────────────────
  function init() {
    initLogin();
    initUpload();
  }

  return { init };

})();

document.addEventListener('DOMContentLoaded', AdminApp.init);
