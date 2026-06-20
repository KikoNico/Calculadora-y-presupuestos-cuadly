// pricing.js — Cuadly
// Única fuente de verdad del pricing. Editar SOLO este archivo si cambian las reglas.
// Contrato: calculatePrice(residencias, plan) → { lineItems, totalMensual, groupDiscount, totalPeriodo, plan, mult }

function calcBaseMonthly(employees) {
  const t1 = Math.min(employees, 20) * 3.00;
  const t2 = Math.max(0, Math.min(employees - 20, 30)) * 2.50;
  const t3 = Math.max(0, employees - 50) * 2.00;
  return Math.max(t1 + t2 + t3, 49);
}

function calcGroupDiscount(numResidencias) {
  if (numResidencias >= 31) return 0.30;
  if (numResidencias >= 16) return 0.25;
  if (numResidencias >= 7)  return 0.20;
  if (numResidencias >= 4)  return 0.15;
  if (numResidencias >= 2)  return 0.10;
  return 0;
}

function calculatePrice(residencias, plan) {
  const multipliers = { mensual: 1, semestral: 5.4, anual: 9.96 };
  const mult = multipliers[plan] || 1;
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
