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
    const nombre    = document.getElementById('nombre').value.trim();
    const contacto  = document.getElementById('contacto').value.trim();
    const empleados = parseInt(document.getElementById('empleados').value);
    return !!(nombre && contacto && empleados > 0);
  }
  const nombre    = document.getElementById('nombre-grupo').value.trim();
  const contacto  = document.getElementById('contacto-grupo').value.trim();
  const validRows = getValidGroupRows();
  return !!(nombre && contacto && validRows.length >= 2);
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

function periodText(plan, total) {
  if (plan === 'mensual')   return '/mes';
  if (plan === 'semestral') return `/6 meses &middot; ${fmt(total / 6)}/mes`;
  return `/año &middot; ${fmt(total / 12)}/mes`;
}

// ── Actualización de resultados ───────────────────────────────────────────────

function updateResults() {
  const residencias = getResidencias();
  const plan = currentMode === 'grupo' ? 'anual' : currentPlan;
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
    { key: 'mensual',   label: 'Mensual',   mult: 1,    badge: '',              period: '/mes'    },
    { key: 'semestral', label: 'Semestral', mult: 5.4,  badge: '1 mes gratis',  period: '/6 meses' },
    { key: 'anual',     label: 'Anual',     mult: 9.96, badge: '2 meses gratis', period: '/año'   }
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
    const ahorro = result.totalMensual * 9.96 * result.groupDiscount;
    html += `<div class="discount-block">
      <div class="discount-block-title">Descuento grupo (${numRes} residencias): −${discountPct}%</div>
      <div>Ahorro anual: ${fmt(ahorro)}</div>
    </div>`;
  }

  html += `<div class="plan-summary">
    <div class="plan-summary-label">Plan Anual — 2 meses gratis</div>
    <div class="plan-summary-price">${fmt(result.totalPeriodo)}</div>
    <div class="plan-summary-period">/año &middot; ${fmt(result.totalPeriodo / 12)}/mes de media</div>
  </div>`;

  return html;
}

// ── Generación del PDF ────────────────────────────────────────────────────────

pdfBtn.addEventListener('click', generatePDF);

function generatePDF() {
  const residencias = getResidencias();
  const plan = currentMode === 'grupo' ? 'anual' : currentPlan;
  const result = calculatePrice(residencias, plan);

  const nombre   = currentMode === 'individual'
    ? document.getElementById('nombre').value.trim()
    : document.getElementById('nombre-grupo').value.trim();
  const contacto = currentMode === 'individual'
    ? document.getElementById('contacto').value.trim()
    : document.getElementById('contacto-grupo').value.trim();
  const email    = currentMode === 'individual'
    ? document.getElementById('email').value.trim()
    : document.getElementById('email-grupo').value.trim();
  const tel      = currentMode === 'individual'
    ? document.getElementById('telefono').value.trim()
    : document.getElementById('telefono-grupo').value.trim();

  const fecha   = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  const validez = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

  // Poblar portada (página 1)
  document.getElementById('pdf-cover-client').textContent = `Cuadly — ${nombre}`;

  // Poblar cabecera y datos cliente (página 2)
  document.getElementById('pdf-fecha').textContent = `${fecha} · Válido hasta: ${validez}`;
  document.getElementById('pdf-cliente-nombre').textContent   = nombre;
  document.getElementById('pdf-cliente-contacto').textContent = contacto;
  document.getElementById('pdf-cliente-email').textContent    = email;
  document.getElementById('pdf-cliente-tel').textContent      = tel;

  // Poblar desglose
  const breakdownEl = document.getElementById('pdf-breakdown');
  breakdownEl.innerHTML = buildBreakdownHTML(result, residencias);

  // Poblar total
  const planLabels = { mensual: 'Mensual', semestral: 'Semestral (6 meses)', anual: 'Anual' };
  const discountNote = result.groupDiscount > 0
    ? `<div style="font-size:13px;color:#059669;margin-bottom:6px;">Descuento grupo ${residencias.length} residencias: −${Math.round(result.groupDiscount * 100)}%</div>`
    : '';
  const periodNote = plan === 'mensual' ? '/mes'
    : plan === 'semestral' ? `/6 meses (${fmt(result.totalPeriodo / 6)}/mes)`
    : `/año (${fmt(result.totalPeriodo / 12)}/mes de media)`;

  document.getElementById('pdf-total-section').innerHTML = `
    <div style="font-size:12px;color:#64748b;margin-bottom:4px;">
      ${planLabels[plan]}${result.groupDiscount > 0 ? ' con descuento de grupo' : ''}
    </div>
    ${discountNote}
    <div style="font-size:30px;font-weight:700;color:#1e3a5f;line-height:1.1;">${fmt(result.totalPeriodo)}</div>
    <div style="font-size:13px;color:#64748b;margin-top:3px;">${periodNote}</div>
  `;

  // Mostrar template, generar PDF, ocultar template
  const template = document.getElementById('pdf-template');
  template.style.display = 'block';

  const safeName = nombre
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, '');
  const fechaISO = new Date().toISOString().split('T')[0];
  const filename = `presupuesto-${safeName}-${fechaISO}.pdf`;

  const originalHTML = pdfBtn.innerHTML;
  pdfBtn.disabled = true;
  pdfBtn.textContent = 'Generando PDF…';

  const opt = {
    margin: 0,
    filename,
    image:       { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, allowTaint: false, logging: false },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(template).save().then(() => {
    template.style.display = 'none';
    pdfBtn.innerHTML = originalHTML;
    pdfBtn.disabled  = !isFormValid();
  });
}

function buildBreakdownHTML(result, residencias) {
  const tdStyle = 'padding:6px 0;';
  const thStyle = 'padding:5px 0;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;font-weight:700;border-bottom:1px solid #e2e8f0;';

  if (currentMode === 'individual') {
    const emp  = residencias[0].empleados;
    const t1   = Math.min(emp, 20);
    const t2   = Math.max(0, Math.min(emp - 20, 30));
    const t3   = Math.max(0, emp - 50);
    const min  = (t1 * 3 + t2 * 2.5 + t3 * 2) < 49;

    let rows = `<tr><td style="${tdStyle}">${t1} empleados × 3,00 €</td><td style="${tdStyle};text-align:right;">${fmt(t1 * 3)}</td></tr>`;
    if (t2 > 0) rows += `<tr><td style="${tdStyle}">${t2} empleados × 2,50 € (tramo 2)</td><td style="${tdStyle};text-align:right;">${fmt(t2 * 2.5)}</td></tr>`;
    if (t3 > 0) rows += `<tr><td style="${tdStyle}">${t3} empleados × 2,00 € (tramo 3)</td><td style="${tdStyle};text-align:right;">${fmt(t3 * 2)}</td></tr>`;
    if (min)    rows += `<tr><td style="${tdStyle};color:#64748b;font-style:italic;" colspan="2">Mínimo mensual aplicado</td></tr>`;
    rows += `<tr style="font-weight:700;border-top:2px solid #e2e8f0;">
      <td style="padding-top:9px;">Total mensual</td>
      <td style="padding-top:9px;text-align:right;">${fmt(result.totalMensual)}</td>
    </tr>`;

    return `<table width="100%" style="border-collapse:collapse;font-size:14px;">
      <thead><tr>
        <th style="${thStyle}">Concepto</th>
        <th style="${thStyle};text-align:right;">Importe</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  }

  // Modo grupo
  let rows = result.lineItems.map(item =>
    `<tr>
      <td style="${tdStyle}">${escHtml(item.nombre)}</td>
      <td style="${tdStyle};text-align:center;">${item.empleados}</td>
      <td style="${tdStyle};text-align:right;">${fmt(item.mensual)}</td>
    </tr>`
  ).join('');
  rows += `<tr style="font-weight:700;border-top:2px solid #e2e8f0;">
    <td style="padding-top:9px;" colspan="2">Subtotal mensual</td>
    <td style="padding-top:9px;text-align:right;">${fmt(result.totalMensual)}</td>
  </tr>`;

  return `<table width="100%" style="border-collapse:collapse;font-size:14px;">
    <thead><tr>
      <th style="${thStyle}">Residencia</th>
      <th style="${thStyle};text-align:center;">Emp.</th>
      <th style="${thStyle};text-align:right;">€/mes</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ── Inicialización ────────────────────────────────────────────────────────────

renderTable();
updateResults();
