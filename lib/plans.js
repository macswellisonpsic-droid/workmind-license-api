const PLANS = {
  teste_pagamento: {
    id: 'teste_pagamento',
    name: 'WorkMind PSI, Teste de Pagamento',
    type: 'TESTE PAGAMENTO',
    days: 7,
    price: 1
  },

  mensal: {
    id: 'mensal',
    name: 'WorkMind PSI Pro Premium - Mensal',
    type: 'MENSAL',
    days: 30,
    price: 97
  },

  bimestral: {
    id: 'bimestral',
    name: 'WorkMind PSI Pro Premium - Bimestral',
    type: 'BIMESTRAL',
    days: 60,
    price: 182
  },

  trimestral: {
    id: 'trimestral',
    name: 'WorkMind PSI Pro Premium - Trimestral',
    type: 'TRIMESTRAL',
    days: 90,
    price: 267
  },

  quadrimestral: {
    id: 'quadrimestral',
    name: 'WorkMind PSI Pro Premium - Quadrimestral',
    type: 'QUADRIMESTRAL',
    days: 120,
    price: 348
  },

  semestral: {
    id: 'semestral',
    name: 'WorkMind PSI Pro Premium - Semestral',
    type: 'SEMESTRAL',
    days: 180,
    price: 510
  },

  anual: {
    id: 'anual',
    name: 'WorkMind PSI Pro Premium - Anual',
    type: 'ANUAL',
    days: 365,
    price: 948
  }
};

function getPlan(planId) {
  return PLANS[String(planId || '').trim()];
}

module.exports = {
  PLANS,
  getPlan
};
