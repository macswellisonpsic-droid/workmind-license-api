const crypto = require('crypto');
const { getPlan, calculatePrice } = require('../lib/plans');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getBody(req) {
  if (typeof req.body === 'object' && req.body !== null) return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  return {};
}

function getApiBaseUrl(req) {
  if (process.env.PUBLIC_API_URL) return process.env.PUBLIC_API_URL.replace(/\/$/, '');
  return `https://${req.headers.host}`;
}

function getSiteUrl() {
  return (process.env.SITE_URL || 'https://download.workmindglobal.online').replace(/\/$/, '');
}

function requireMercadoPagoToken() {
  if (!process.env.MP_ACCESS_TOKEN) {
    throw new Error('MP_ACCESS_TOKEN não configurado na Vercel.');
  }
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  }

  try {
    requireMercadoPagoToken();

    const body = getBody(req);

    const nome = String(body.nome || body.nomeCompleto || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const whatsapp = String(body.whatsapp || '').trim();
    const crp = String(body.crp || '').trim();
    const hwid = String(body.hwid || '').trim().replace(/['"]/g, '');
    const planId = String(body.plano || body.planId || '').trim();
    const coupon = String(body.cupom || body.coupon || '').trim().toUpperCase();

    const plan = getPlan(planId);

    if (!plan) {
      return res.status(400).json({ success: false, error: 'Plano inválido.' });
    }

    if (!nome || nome.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Informe seu nome completo.',
      });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Informe um e-mail válido.',
      });
    }

    if (!whatsapp || whatsapp.replace(/\D/g, '').length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Informe um WhatsApp válido com DDD.',
      });
    }

    if (!hwid || hwid.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Informe o HWID exibido na WorkMind PSI.',
      });
    }

    const priceInfo = calculatePrice(plan, coupon);
    const orderId = crypto.randomUUID();
    const apiBaseUrl = getApiBaseUrl(req);
    const siteUrl = getSiteUrl();
    const webhookToken = String(process.env.WEBHOOK_TOKEN || '').trim();
    const webhookUrl = webhookToken
      ? `${apiBaseUrl}/api/webhook?token=${encodeURIComponent(webhookToken)}`
      : `${apiBaseUrl}/api/webhook`;

    const preference = {
      external_reference: orderId,

      items: [
        {
          id: plan.id,
          title: plan.name,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: priceInfo.price,
        },
      ],

      payer: {
        name: nome,
        email,
      },

      metadata: {
        order_id: orderId,
        nome,
        customer_name: nome,
        email,
        customer_email: email,
        whatsapp,
        crp,
        hwid,
        plan_id: plan.id,
        plan_name: plan.name,
        plan_type: plan.type,
        plan_days: plan.days,
        original_price: plan.price,
        final_price: priceInfo.price,
        discount_amount: priceInfo.discountAmount,
        coupon_code: priceInfo.couponCode,
        coupon_applied: priceInfo.couponApplied,
        discount_percent: priceInfo.discountPercent,
      },

      notification_url: webhookUrl,

      back_urls: {
        success: `${siteUrl}/licenca-sucesso.html`,
        pending: `${siteUrl}/licenca-pendente.html`,
        failure: `${siteUrl}/licenca-erro.html`,
      },

      auto_return: 'approved',
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      return res.status(400).json({
        success: false,
        error: 'Erro ao criar pagamento no Mercado Pago.',
        details: mpData,
      });
    }

    return res.status(200).json({
      success: true,
      orderId,
      preferenceId: mpData.id,
      paymentUrl: mpData.init_point,
      sandboxUrl: mpData.sandbox_init_point || '',
      price: priceInfo.price,
      originalPrice: plan.price,
      finalPrice: priceInfo.finalPrice,
      discountAmount: priceInfo.discountAmount,
      couponApplied: priceInfo.couponApplied,
      couponCode: priceInfo.couponCode,
      discountPercent: priceInfo.discountPercent,
      webhookConfigured: Boolean(webhookUrl),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || String(err),
    });
  }
};
