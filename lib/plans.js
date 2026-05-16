const PLANS = {
  teste_pagamento: {
    id: 'teste_pagamento',
    name: 'WorkMind PSI, Teste de Pagamento',
    type: 'TESTE PAGAMENTO',
    days: 7,
    price: 1,
    allowCoupon: false
  },

  mensal: {
    id: 'mensal',
    name: 'WorkMind PSI Pro Premium - Mensal',
    type: 'MENSAL',
    days: 30,
    price: 97,
    allowCoupon: true
  },

  bimestral: {
    id: 'bimestral',
    name: 'WorkMind PSI Pro Premium - Bimestral',
    type: 'BIMESTRAL',
    days: 60,
    price: 182,
    allowCoupon: true
  },

  trimestral: {
    id: 'trimestral',
    name: 'WorkMind PSI Pro Premium - Trimestral',
    type: 'TRIMESTRAL',
    days: 90,
    price: 267,
    allowCoupon: true
  },

  quadrimestral: {
    id: 'quadrimestral',
    name: 'WorkMind PSI Pro Premium - Quadrimestral',
    type: 'QUADRIMESTRAL',
    days: 120,
    price: 348,
    allowCoupon: true
  },

  semestral: {
    id: 'semestral',
    name: 'WorkMind PSI Pro Premium - Semestral',
    type: 'SEMESTRAL',
    days: 180,
    price: 510,
    allowCoupon: true
  },

  anual: {
    id: 'anual',
    name: 'WorkMind PSI Pro Premium - Anual',
    type: 'ANUAL',
    days: 365,
    price: 948,
    allowCoupon: true
  },

  standard: {
    id: 'standard',
    name: 'WorkMind PSI Clínica - Standard',
    type: 'CLINICA STANDARD',
    days: 365,
    price: 1597,
    allowCoupon: true
  },

  'profissional-clinica': {
    id: 'profissional-clinica',
    name: 'WorkMind PSI Clínica - Profissional',
    type: 'CLINICA PROFISSIONAL',
    days: 365,
    price: 2997,
    allowCoupon: true
  },

  'premium-clinica': {
    id: 'premium-clinica',
    name: 'WorkMind PSI Clínica - Premium',
    type: 'CLINICA PREMIUM',
    days: 365,
    price: 4197,
    allowCoupon: true
  }
};

function getPlan(planId) {
  return PLANS[String(planId || '').trim()];
}

function calculatePrice(plan, couponCode) {
  const cleanCoupon = String(couponCode || '').trim().toUpperCase();

  const betaCoupon =
    String(process.env.BETA_COUPON_CODE || 'BETA10').trim().toUpperCase();

  if (plan.allowCoupon && cleanCoupon && cleanCoupon === betaCoupon) {
    return {
      price: Number((plan.price * 0.9).toFixed(2)),
      couponApplied: true,
      couponCode: cleanCoupon,
      discountPercent: 10
    };
  }

  return {
    price: plan.price,
    couponApplied: false,
    couponCode: cleanCoupon || '',
    discountPercent: 0
  };
}

module.exports = {
  PLANS,
  getPlan,
  calculatePrice
};
