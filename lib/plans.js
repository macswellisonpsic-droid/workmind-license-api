const PLANS = {
  mensal: {
    id: 'mensal',
    name: 'WorkMind PSI Pro Premium - Mensal',
    type: 'MENSAL',
    days: 30,
    price: 97,
    allowCoupon: true,
  },

  bimestral: {
    id: 'bimestral',
    name: 'WorkMind PSI Pro Premium - Bimestral',
    type: 'BIMESTRAL',
    days: 60,
    price: 182,
    allowCoupon: true,
  },

  trimestral: {
    id: 'trimestral',
    name: 'WorkMind PSI Pro Premium - Trimestral',
    type: 'TRIMESTRAL',
    days: 90,
    price: 267,
    allowCoupon: true,
  },

  quadrimestral: {
    id: 'quadrimestral',
    name: 'WorkMind PSI Pro Premium - Quadrimestral',
    type: 'QUADRIMESTRAL',
    days: 120,
    price: 348,
    allowCoupon: true,
  },

  semestral: {
    id: 'semestral',
    name: 'WorkMind PSI Pro Premium - Semestral',
    type: 'SEMESTRAL',
    days: 180,
    price: 510,
    allowCoupon: true,
  },

  anual: {
    id: 'anual',
    name: 'WorkMind PSI Pro Premium - Anual',
    type: 'ANUAL',
    days: 365,
    price: 948,
    allowCoupon: true,
  },

  standard: {
    id: 'standard',
    name: 'WorkMind PSI Clínica - Standard',
    type: 'CLINICA STANDARD',
    days: 365,
    price: 1597,
    allowCoupon: true,
  },

  'profissional-clinica': {
    id: 'profissional-clinica',
    name: 'WorkMind PSI Clínica - Profissional',
    type: 'CLINICA PROFISSIONAL',
    days: 365,
    price: 2997,
    allowCoupon: true,
  },

  'premium-clinica': {
    id: 'premium-clinica',
    name: 'WorkMind PSI Clínica - Premium',
    type: 'CLINICA PREMIUM',
    days: 365,
    price: 4197,
    allowCoupon: true,
  },
};

const COUPONS = {
  BETA10: {
    code: 'BETA10',
    discountPercent: 10,
    description: 'Desconto de 10% para testadores beta',
  },
};

function getPlan(planId) {
  return PLANS[String(planId || '').trim()];
}

function normalizeCoupon(couponCode) {
  return String(couponCode || '').trim().toUpperCase();
}

function getCoupon(couponCode) {
  const cleanCoupon = normalizeCoupon(couponCode);
  const envCoupon = normalizeCoupon(process.env.BETA_COUPON_CODE || 'BETA10');

  if (cleanCoupon && cleanCoupon === envCoupon) {
    return COUPONS.BETA10;
  }

  return COUPONS[cleanCoupon] || null;
}

function calculatePrice(plan, couponCode) {
  const cleanCoupon = normalizeCoupon(couponCode);
  const coupon = getCoupon(cleanCoupon);

  if (plan.allowCoupon && coupon) {
    const discountAmount = Number((plan.price * (coupon.discountPercent / 100)).toFixed(2));
    const finalPrice = Number((plan.price - discountAmount).toFixed(2));

    return {
      price: finalPrice,
      originalPrice: plan.price,
      finalPrice,
      discountAmount,
      couponApplied: true,
      couponCode: coupon.code,
      discountPercent: coupon.discountPercent,
    };
  }

  return {
    price: plan.price,
    originalPrice: plan.price,
    finalPrice: plan.price,
    discountAmount: 0,
    couponApplied: false,
    couponCode: cleanCoupon || '',
    discountPercent: 0,
  };
}

module.exports = {
  PLANS,
  COUPONS,
  getPlan,
  calculatePrice,
};
