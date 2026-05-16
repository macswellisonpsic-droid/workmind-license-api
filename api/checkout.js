const crypto = require('crypto');
const { getPlan } = require('../lib/plans');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getBody(req) {
  if (typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  return {};
}

function getApiBaseUrl(req) {
  if (process.env.PUBLIC_API_URL) return process.env.PUBLIC_API_URL.replace(/\/$/, '');
  return `https://${req.headers.host}`;
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  }

  try {
    const body = getBody(req);

    const nome = String(body.nome || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const whatsapp = String(body.whatsapp || '').trim();
    const crp = String(body.crp || '').trim();
    const hwid = String(body.hwid || '').trim().replace(/['"]/g, '');
    const planId = String(body.plano || body.planId || '').trim();

    const plan = getPlan(planId);

    if (!plan) {
      return res.status(400).json({ success: false, error: 'Plano inválido.' });
    }

    if (!nome || !email || !email.includes('@') || !hwid) {
      return res.status(400).json({
        success: false,
        error: 'Nome, e-mail e HWID são obrigatórios.'
      });
    }

    const orderId = crypto.randomUUID();
    const apiBaseUrl = getApiBaseUrl(req);
    const siteUrl = (process.env.SITE_URL || 'https://download.workmindglobal.online').replace(/\/$/, '');

    const preference = {
      external_reference: orderId,

      items: [
        {
          id: plan.id,
          title: plan.name,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: plan.price
        }
      ],

      payer: {
        name: nome,
        email
      },

      metadata: {
        order_id: orderId,
        nome,
        email,
        whatsapp,
        crp,
        hwid,
        plan_id: plan.id,
        plan_name: plan.name,
        plan_type: plan.type,
        plan_days: plan.days
      },

      notification_url: `${apiBaseUrl}/api/webhook?token=${encodeURIComponent(process.env.WEBHOOK_TOKEN || '')}`,

      back_urls: {
        success: `${siteUrl}/licenca-sucesso.html`,
        pending: `${siteUrl}/licenca-pendente.html`,
        failure: `${siteUrl}/licenca-erro.html`
      },

      auto_return: 'approved'
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preference)
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      return res.status(400).json({
        success: false,
        error: 'Erro ao criar pagamento no Mercado Pago.',
        details: mpData
      });
    }

    return res.status(200).json({
      success: true,
      orderId,
      preferenceId: mpData.id,
      paymentUrl: mpData.init_point,
      sandboxUrl: mpData.sandbox_init_point || ''
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || String(err)
    });
  }
};