// script.js — Cuadly Calculadora de Presupuesto

// ── Estado ────────────────────────────────────────────────────────────────────

let currentMode = 'individual';
let currentPlan = 'anual';
let nextId = 1;
let groupRows = [
  { id: nextId++, nombre: '', empleados: '' },
  { id: nextId++, nombre: '', empleados: '' }
];

// ── Referencias DOM ───────────────────────────────────────────────────────────

const modeButtons      = document.querySelectorAll('.mode-btn');
const planButtons      = document.querySelectorAll('.plan-btn');
const individualFields = document.getElementById('individual-fields');
const grupoFields      = document.getElementById('grupo-fields');
const tbody            = document.getElementById('residencias-tbody');
const resultPlaceholder = document.getElementById('result-placeholder');
const resultContent    = document.getElementById('result-content');
const pdfBtn           = document.getElementById('pdf-btn');

// ── Modo (individual / grupo) ─────────────────────────────────────────────────

modeButtons.forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));

function setMode(mode) {
  currentMode = mode;
  modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  individualFields.style.display = mode === 'individual' ? '' : 'none';
  grupoFields.style.display      = mode === 'grupo'      ? '' : 'none';
  resetForm();
}

function resetForm() {
  ['nombre', 'contacto', 'email', 'telefono', 'empleados'].forEach(id => {
    document.getElementById(id).value = '';
  });
  ['nombre-grupo', 'contacto-grupo', 'email-grupo', 'telefono-grupo'].forEach(id => {
    document.getElementById(id).value = '';
  });
  nextId = 1;
  groupRows = [
    { id: nextId++, nombre: '', empleados: '' },
    { id: nextId++, nombre: '', empleados: '' }
  ];
  renderTable();
  updateResults();
}

// ── Plan de pago (solo individual) ────────────────────────────────────────────

planButtons.forEach(btn => btn.addEventListener('click', () => selectPlan(btn.dataset.plan)));

function selectPlan(plan) {
  currentPlan = plan;
  planButtons.forEach(b => b.classList.toggle('active', b.dataset.plan === plan));
  updateResults();
}

// ── Tabla dinámica de residencias (modo grupo) ────────────────────────────────

function renderTable() {
  tbody.innerHTML = groupRows.map(row => `
    <tr>
      <td><input type="text" placeholder="Nombre residencia" value="${escHtml(row.nombre)}"
          oninput="updateRow(${row.id},'nombre',this.value)"></td>
      <td><input type="number" placeholder="Nº" min="1" max="999" value="${row.empleados !== '' ? row.empleados : ''}"
          oninput="updateRow(${row.id},'empleados',this.value)"></td>
      <td>${groupRows.length > 2
        ? `<button class="btn-remove" onclick="removeRow(${row.id})" title="Eliminar fila">×</button>`
        : ''}</td>
    </tr>
  `).join('');
}

function updateRow(id, field, value) {
  const row = groupRows.find(r => r.id === id);
  if (row) row[field] = value;
  updateResults();
}

function removeRow(id) {
  groupRows = groupRows.filter(r => r.id !== id);
  renderTable();
  updateResults();
}

function addResidencia() {
  groupRows.push({ id: nextId++, nombre: '', empleados: '' });
  renderTable();
  updateResults();
  // Foco en el nuevo input
  const rows = tbody.querySelectorAll('tr');
  const lastInput = rows[rows.length - 1].querySelector('input[type="text"]');
  if (lastInput) lastInput.focus();
}

document.getElementById('add-residencia').addEventListener('click', addResidencia);

// ── Listeners de inputs individuales ─────────────────────────────────────────

['nombre', 'contacto', 'email', 'telefono', 'empleados'].forEach(id =>
  document.getElementById(id).addEventListener('input', updateResults));

['nombre-grupo', 'contacto-grupo', 'email-grupo', 'telefono-grupo'].forEach(id =>
  document.getElementById(id).addEventListener('input', updateResults));

// ── Validación del formulario ─────────────────────────────────────────────────

function isFormValid() {
  if (currentMode === 'individual') {
    const contacto  = document.getElementById('contacto').value.trim();
    const empleados = parseInt(document.getElementById('empleados').value);
    return !!(contacto && empleados > 0);
  }
  const contacto  = document.getElementById('contacto-grupo').value.trim();
  const validRows = getValidGroupRows();
  return !!(contacto && validRows.length >= 2);
}

function getValidGroupRows() {
  return groupRows.filter(r => r.nombre.trim() && parseInt(r.empleados) > 0);
}

// ── Construir array para calculatePrice ──────────────────────────────────────

function getResidencias() {
  if (currentMode === 'individual') {
    return [{
      nombre:    document.getElementById('nombre').value.trim(),
      empleados: parseInt(document.getElementById('empleados').value) || 0
    }];
  }
  return getValidGroupRows().map(r => ({
    nombre:    r.nombre.trim(),
    empleados: parseInt(r.empleados)
  }));
}

// ── Utilidades de formato ─────────────────────────────────────────────────────

function fmt(n) {
  return n.toFixed(2).replace('.', ',') + ' €';
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Fechas de vigencia ────────────────────────────────────────────────────────

function getInicioServicio() {
  const value = document.getElementById('inicio-servicio').value;
  if (!value) return new Date();
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Suma meses conservando el día; si el mes destino es más corto, se ajusta al último día
function addMonths(date, meses) {
  const d = new Date(date.getFullYear(), date.getMonth() + meses, 1);
  const ultimoDia = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(date.getDate(), ultimoDia));
  return d;
}

function fechaFin(inicio, meses) {
  const fin = addMonths(inicio, meses);
  // Si el mes destino era más corto, addMonths ya devolvió su último día: ese es el fin
  if (fin.getDate() !== inicio.getDate()) return fin;
  fin.setDate(fin.getDate() - 1);
  return fin;
}

function fmtFecha(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${date.getFullYear()}`;
}

function periodText(plan, total) {
  if (plan === 'mensual')   return '/mes';
  if (plan === 'semestral') return `/6 meses &middot; ${fmt(total / 6)}/mes`;
  return `/año &middot; ${fmt(total / 12)}/mes`;
}

// ── Actualización de resultados ───────────────────────────────────────────────

function updateResults() {
  const residencias = getResidencias();
  const plan = currentPlan;
  const hasData = residencias.length > 0 && residencias.every(r => r.empleados > 0);

  if (!hasData) {
    resultPlaceholder.style.display = '';
    resultContent.style.display = 'none';
    pdfBtn.disabled = true;
    return;
  }

  const result = calculatePrice(residencias, plan);
  resultPlaceholder.style.display = 'none';
  resultContent.style.display = '';
  resultContent.innerHTML = currentMode === 'individual'
    ? renderIndividual(result, residencias[0].empleados, plan)
    : renderGroup(result, residencias);

  pdfBtn.disabled = !isFormValid();
}

// ── Render modo individual ────────────────────────────────────────────────────

function renderIndividual(result, emp, plan) {
  const planLabels = { mensual: 'Mensual', semestral: 'Semestral', anual: 'Anual' };
  const planBadges = { mensual: '', semestral: '1 mes gratis', anual: '2 meses gratis' };

  const t1emp = Math.min(emp, 20);
  const t2emp = Math.max(0, Math.min(emp - 20, 30));
  const t3emp = Math.max(0, emp - 50);
  const computed = t1emp * 3 + t2emp * 2.5 + t3emp * 2;

  let html = '<div class="result-breakdown"><h3>Desglose mensual</h3>';
  html += `<div class="breakdown-row"><span>${t1emp} emp × 3,00 €</span><span>${fmt(t1emp * 3)}</span></div>`;
  if (t2emp > 0) html += `<div class="breakdown-row"><span>${t2emp} emp × 2,50 € (tramo 2)</span><span>${fmt(t2emp * 2.5)}</span></div>`;
  if (t3emp > 0) html += `<div class="breakdown-row"><span>${t3emp} emp × 2,00 € (tramo 3)</span><span>${fmt(t3emp * 2)}</span></div>`;
  if (computed < 49) html += `<div class="breakdown-row muted"><span>Mínimo mensual aplicado</span><span></span></div>`;
  html += `<div class="breakdown-row total"><span>Total mensual</span><span>${fmt(result.totalMensual)}</span></div>`;
  html += '</div>';

  const badge = planBadges[plan];
  html += `<div class="plan-summary">
    <div class="plan-summary-label">${planLabels[plan]}</div>
    <div class="plan-summary-price">${fmt(result.totalPeriodo)}</div>
    <div class="plan-summary-period">${periodText(plan, result.totalPeriodo)}</div>
    ${badge ? `<div class="plan-summary-badge">${badge}</div>` : ''}
  </div>`;

  const allPlans = [
    { key: 'mensual',   label: 'Mensual',   mult: PLAN_MULTIPLIERS.mensual,   badge: '',               period: '/mes'     },
    { key: 'semestral', label: 'Semestral', mult: PLAN_MULTIPLIERS.semestral, badge: '1 mes gratis',   period: '/6 meses' },
    { key: 'anual',     label: 'Anual',     mult: PLAN_MULTIPLIERS.anual,     badge: '2 meses gratis', period: '/año'     }
  ];

  html += '<div class="plan-comparison"><h3>Comparar planes</h3>';
  allPlans.forEach(p => {
    const total = result.totalMensual * p.mult;
    const active = p.key === plan;
    html += `<div class="plan-row${active ? ' active' : ''}" onclick="selectPlan('${p.key}')">
      <span class="plan-row-name">${p.label}${p.badge ? `<span class="badge-small">${p.badge}</span>` : ''}</span>
      <span>${fmt(total)}<small style="color:var(--muted);font-weight:400;font-size:12px;"> ${p.period}</small></span>
    </div>`;
  });
  html += '</div>';

  return html;
}

// ── Render modo grupo ─────────────────────────────────────────────────────────

function renderGroup(result, residencias) {
  const discountPct = Math.round(result.groupDiscount * 100);
  const numRes = residencias.length;
  const plan = result.plan;
  const planLabels = { mensual: 'Mensual', semestral: 'Semestral', anual: 'Anual' };
  const planBadges = { mensual: '', semestral: '1 mes gratis', anual: '2 meses gratis' };

  let html = '<div class="result-breakdown"><h3>Residencias del grupo</h3>';
  html += '<table class="group-table"><thead><tr><th>Residencia</th><th>Emp.</th><th class="right">€/mes</th></tr></thead><tbody>';
  result.lineItems.forEach(item => {
    html += `<tr>
      <td>${escHtml(item.nombre)}</td>
      <td>${item.empleados}</td>
      <td class="right">${fmt(item.mensual)}</td>
    </tr>`;
  });
  html += `</tbody><tfoot><tr>
    <td colspan="2">Subtotal mensual</td>
    <td class="right">${fmt(result.totalMensual)}</td>
  </tr></tfoot></table></div>`;

  if (result.groupDiscount > 0) {
    const ahorro = result.totalMensual * result.mult * result.groupDiscount;
    html += `<div class="discount-block">
      <div class="discount-block-title">Descuento grupo (${numRes} residencias): −${discountPct}%</div>
      <div>Ahorro ${planLabels[plan].toLowerCase()}: ${fmt(ahorro)}</div>
    </div>`;
  }

  const badge = planBadges[plan];
  html += `<div class="plan-summary">
    <div class="plan-summary-label">${planLabels[plan]}</div>
    <div class="plan-summary-price">${fmt(result.totalPeriodo)}</div>
    <div class="plan-summary-period">${periodText(plan, result.totalPeriodo)}</div>
    ${badge ? `<div class="plan-summary-badge">${badge}</div>` : ''}
  </div>`;

  const allPlans = [
    { key: 'mensual',   label: 'Mensual',   mult: PLAN_MULTIPLIERS.mensual,   badge: '',               period: '/mes'     },
    { key: 'semestral', label: 'Semestral', mult: PLAN_MULTIPLIERS.semestral, badge: '1 mes gratis',   period: '/6 meses' },
    { key: 'anual',     label: 'Anual',     mult: PLAN_MULTIPLIERS.anual,     badge: '2 meses gratis', period: '/año'     }
  ];

  html += '<div class="plan-comparison"><h3>Comparar planes</h3>';
  allPlans.forEach(p => {
    const total = result.totalMensual * p.mult * (1 - result.groupDiscount);
    const active = p.key === plan;
    html += `<div class="plan-row${active ? ' active' : ''}" onclick="selectPlan('${p.key}')">
      <span class="plan-row-name">${p.label}${p.badge ? `<span class="badge-small">${p.badge}</span>` : ''}</span>
      <span>${fmt(total)}<small style="color:var(--muted);font-weight:400;font-size:12px;"> ${p.period}</small></span>
    </div>`;
  });
  html += '</div>';

  return html;
}

// ── Generación del PDF ────────────────────────────────────────────────────────

pdfBtn.addEventListener('click', generatePDF);

function generatePDF() {
  const residencias = getResidencias();
  const plan = currentPlan;
  const result = calculatePrice(residencias, plan);

  const contacto = currentMode === 'individual'
    ? document.getElementById('contacto').value.trim()
    : document.getElementById('contacto-grupo').value.trim();
  const nombre   = currentMode === 'individual'
    ? document.getElementById('nombre').value.trim()
    : document.getElementById('nombre-grupo').value.trim();
  const email    = currentMode === 'individual'
    ? document.getElementById('email').value.trim()
    : document.getElementById('email-grupo').value.trim();
  const tel      = currentMode === 'individual'
    ? document.getElementById('telefono').value.trim()
    : document.getElementById('telefono-grupo').value.trim();

  const fecha   = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  const validez = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

  // Poblar portada (página 1)
  document.getElementById('pdf-cover-client').textContent = nombre ? `Cuadly - ${nombre}` : '';

  // Poblar cabecera y datos cliente (página 2)
  document.getElementById('pdf-fecha').textContent = `${fecha} · Válido hasta: ${validez}`;
  document.getElementById('pdf-cliente-nombre').textContent   = nombre;
  document.getElementById('pdf-cliente-contacto').textContent = contacto;
  document.getElementById('pdf-cliente-email').textContent    = email;
  document.getElementById('pdf-cliente-tel').textContent      = tel;

  // Poblar página 2 (opciones de pago)
  document.getElementById('pdf-planes').innerHTML = buildPagoTablasHTML(result, getInicioServicio());

  // Poblar página 3 (condiciones generales)
  document.getElementById('pdf-fecha-cg').textContent          = fecha;

  // Poblar página 4 (firmante)
  document.getElementById('pdf-fecha-p3').textContent          = fecha;
  document.getElementById('pdf-firmante-empresa').textContent  = nombre;
  document.getElementById('pdf-firmante-email').textContent    = email;
  document.getElementById('pdf-firmante-contacto').textContent = contacto;
  document.getElementById('pdf-firmante-fecha').textContent    = fecha;

  document.getElementById('pdf-template').style.display = 'block';

  window.addEventListener('afterprint', function restore() {
    document.getElementById('pdf-template').style.display = 'none';
    window.removeEventListener('afterprint', restore);
  }, { once: true });

  window.print();
}

// Tres tablas (Mensual / Semestral / Anual) con vigencia, meses gratis y total a desembolsar
function buildPagoTablasHTML(result, inicio) {
  const planes = [
    { key: 'mensual',   label: 'Pago Mensual',   beneficio: 'Sin compromiso', color: '#64748b' },
    { key: 'semestral', label: 'Pago Semestral', beneficio: '1 mes gratis',   color: '#059669' },
    { key: 'anual',     label: 'Pago Anual',     beneficio: '2 meses gratis', color: '#059669' }
  ];
  const th  = 'padding:6px 8px; border:1px solid #cbd5e1; background:#f8fafc; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:#64748b; text-align:left;';
  const td  = 'padding:6px 8px; border:1px solid #cbd5e1; font-size:11px;';
  const tdR = td + ' text-align:right;';
  const verde = ' color:#059669;';

  return planes.map(p => {
    const meses  = MESES_PLAN[p.key];
    const gratis = mesesGratis(p.key);
    const desde  = fmtFecha(inicio);
    const hasta  = fmtFecha(fechaFin(inicio, meses));

    // Las filas muestran el precio íntegro del periodo; los descuentos se restan debajo
    const rows = result.lineItems.map(item => `<tr>
      <td style="${td}">${currentMode === 'individual' ? 'Cuadly' : escHtml(item.nombre)}</td>
      <td style="${td}">${desde}</td>
      <td style="${td}">${hasta}</td>
      <td style="${tdR}">${item.empleados}</td>
      <td style="${tdR}">${fmt(item.mensual * meses)}</td>
    </tr>`).join('');

    const bruto        = result.totalMensual * meses;
    const ahorroGratis = result.totalMensual * gratis;
    const trasGratis   = bruto - ahorroGratis;
    const ahorroGrupo  = trasGratis * result.groupDiscount;
    const total        = trasGratis - ahorroGrupo;

    let extra = '';
    if (gratis > 0) {
      extra += `<tr>
        <td style="${td}" colspan="4">Precio sin descuento (${meses} meses)</td>
        <td style="${tdR}">${fmt(bruto)}</td>
      </tr>
      <tr>
        <td style="${td}${verde}">${gratis === 1 ? '1 mes gratis' : `${gratis} meses gratis`}
          <span style="color:#64748b;">· solo se facturan ${meses - gratis} de ${meses} meses</span></td>
        <td style="${td}" colspan="3"></td>
        <td style="${tdR}${verde}">−${fmt(ahorroGratis)}</td>
      </tr>`;
    }
    if (result.groupDiscount > 0) {
      extra += `<tr>
        <td style="${td}${verde}" colspan="4">Descuento de grupo (${result.lineItems.length} residencias) · −${Math.round(result.groupDiscount * 100)}%</td>
        <td style="${tdR}${verde}">−${fmt(ahorroGrupo)}</td>
      </tr>`;
    }

    const ahorroTotal = ahorroGratis + ahorroGrupo;
    const pie = ahorroTotal > 0
      ? `<div style="font-size:10.5px; color:#059669; font-weight:600; margin-top:4px;">
           Ahorro total frente al precio sin descuento: ${fmt(ahorroTotal)}
         </div>`
      : '';

    return `<div style="margin-bottom:12px;">
      <div style="font-size:12px; font-weight:700; color:#1e293b; margin-bottom:5px;">
        ${p.label}
        <span style="font-weight:600; font-size:11px; margin-left:8px; color:${p.color};">${p.beneficio}</span>
      </div>
      <table width="100%" style="border-collapse:collapse;">
        <thead><tr>
          <th style="${th}">Concepto</th>
          <th style="${th}">Fecha de inicio</th>
          <th style="${th}">Fecha de finalización</th>
          <th style="${th} text-align:right;">Empleados</th>
          <th style="${th} text-align:right;">Importe</th>
        </tr></thead>
        <tbody>
          ${rows}
          ${extra}
          <tr>
            <td style="${td} background:#f8fafc; font-weight:700;" colspan="4">Total a pagar</td>
            <td style="${tdR} background:#f8fafc; font-weight:700;">${fmt(total)}</td>
          </tr>
        </tbody>
      </table>
      ${pie}
    </div>`;
  }).join('');
}

// ── Inicialización ────────────────────────────────────────────────────────────

const hoy = new Date();
document.getElementById('inicio-servicio').value =
  `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

renderTable();
updateResults();
