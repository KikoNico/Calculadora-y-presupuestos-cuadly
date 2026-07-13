// pricing.js — Cuadly
// Única fuente de verdad del pricing. Editar SOLO este archivo si cambian las reglas.
// Contrato: calculatePrice(residencias, plan) → { lineItems, totalMensual, groupDiscount, totalPeriodo, plan, mult }

// Meses que dura cada periodo y meses que se pagan realmente.
// La diferencia son los "meses gratis": semestral 6−5 = 1 · anual 12−10 = 2.
const MESES_PLAN       = { mensual: 1, semestral: 6,  anual: 12 };
const PLAN_MULTIPLIERS = { mensual: 1, semestral: 5,  anual: 10 };

function mesesGratis(plan) {
  return MESES_PLAN[plan] - PLAN_MULTIPLIERS[plan];
}

function calcBaseMonthly(employees) {
  const t1 = Math.min(employees, 20) * 3.00;
  const t2 = Math.max(0, Math.min(employees - 20, 30)) * 2.50;
  const t3 = Math.max(0, employees - 50) * 2.00;
  return Math.max(t1 + t2 + t3, 49);
}

function calcGroupDiscount(numResidencias) {
  if (numResidencias >= 31) return 0.25;
  if (numResidencias >= 16) return 0.20;
  if (numResidencias >= 7)  return 0.15;
  if (numResidencias >= 2)  return 0.10;
  return 0;
}

function calculatePrice(residencias, plan) {
  const mult = PLAN_MULTIPLIERS[plan] || 1;
  const groupDiscount = residencias.length > 1 ? calcGroupDiscount(residencias.length) : 0;

  const lineItems = residencias.map(r => ({
    nombre: r.nombre,
    empleados: r.empleados,
    mensual: calcBaseMonthly(r.empleados)
  }));

  const totalMensual = lineItems.reduce((s, r) => s + r.mensual, 0);
  const totalPeriodo = totalMensual * mult * (1 - groupDiscount);

  return { lineItems, totalMensual, groupDiscount, totalPeriodo, plan, mult };
}
