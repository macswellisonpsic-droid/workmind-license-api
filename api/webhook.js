const { generateLicense } = require('../lib/license');
const { sendLicenseEmail } = require('../lib/email');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getBody(req) {
  if (typeof req.body === 'object' && req.body !== null) return req.body;

  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}');
    } catch {
      return {};
    }
  }

  return {};
}

function normalizeMetadata(payment) {
  const metadata = payment.metadata || {};

  return {
    nome: metadata.nome || metadata.customer_name || payment.payer?.first_name || 'Cliente',
    email: metadata.email || metadata.customer_email || payment.payer?.email || '',
    whatsapp: metadata.whatsapp || '',
    hwid: metadata.hwid || '',
    planId: metadata.plan_id || '',
    planName: metadata.plan_name || 'WorkMind PSI',
    planType: metadata.plan_type || 'LICENCA',
    planDays: Number(metadata.plan_days || metadata.days || 0),
    couponCode: metadata.coupon_code || '',
    couponApplied: Boolean(metadata.coupon_applied)
  };
}

async function consultMercadoPagoPayment(paymentId) {
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
      }
    }
  );

  const data = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data
  };
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      route: 'webhook',
      message: 'Webhook WorkMind PSI ativo. Use POST para notificações do Mercado Pago.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Método não permitido.'
    });
  }

  try {
    const token = String(req.query.token || '');

    if (!process.env.WEBHOOK_TOKEN || token !== process.env.WEBHOOK_TOKEN) {
      return res.status(401).json({
        success: false,
        error: 'Webhook não autorizado.'
      });
    }

    const body = getBody(req);

    const eventType = body.type || body.topic || '';
    const action = body.action || '';
    const paymentId = body?.data?.id || body.id || req.query.id || '';

    console.log('[WEBHOOK] Recebido:', {
      eventType,
      action,
      paymentId,
      liveMode: body.live_mode,
      body
    });

    if (eventType && eventType !== 'payment') {
      return res.status(200).json({
        success: true,
        ignored: true,
        reason: 'Evento ignorado porque não é pagamento.'
      });
    }

    if (!paymentId) {
      return res.status(200).json({
        success: true,
        ignored: true,
        reason: 'Notificação sem paymentId.'
      });
    }

    if (String(paymentId) === '123456' || body.live_mode === false) {
      return res.status(200).json({
        success: true,
        simulated: true,
        message: 'Simulação do Mercado Pago recebida com sucesso.',
        paymentId
      });
    }

    if (!process.env.MP_ACCESS_TOKEN) {
      throw new Error('MP_ACCESS_TOKEN não configurado na Vercel.');
    }

    const paymentResult = await consultMercadoPagoPayment(paymentId);

    console.log('[WEBHOOK] Pagamento consultado:', {
      ok: paymentResult.ok,
      status: paymentResult.status,
      paymentStatus: paymentResult.data?.status,
      paymentId
    });

    if (!paymentResult.ok) {
      return res.status(200).json({
        success: true,
        ignored: true,
        reason: 'Não foi possível consultar o pagamento. O Mercado Pago pode reenviar depois.',
        paymentId,
        mercadoPagoStatus: paymentResult.status
      });
    }

    const payment = paymentResult.data;

    if (payment.status !== 'approved') {
      return res.status(200).json({
        success: true,
        ignored: true,
        reason: 'Pagamento ainda não aprovado.',
        paymentId,
        status: payment.status
      });
    }

    const data = normalizeMetadata(payment);

    if (!data.email || !data.email.includes('@')) {
      throw new Error('Pagamento aprovado, mas sem e-mail válido.');
    }

    if (!data.hwid || data.hwid.length < 3) {
      throw new Error('Pagamento aprovado, mas sem HWID válido.');
    }

    if (!data.planDays || data.planDays <= 0) {
      throw new Error('Pagamento aprovado, mas sem validade do plano.');
    }

    const generated = generateLicense({
      hwid: data.hwid,
      email: data.email,
      days: data.planDays,
      type: data.planType
    });

    await sendLicenseEmail({
      to: data.email,
      customerName: data.nome,
      planName: data.planName,
      hwid: data.hwid,
      license: generated.license,
      expiresAt: generated.expire,
      paymentId: String(payment.id)
    });

    console.log('[WEBHOOK] Licença enviada com sucesso:', {
      paymentId: payment.id,
      email: data.email,
      hwid: data.hwid,
      planName: data.planName,
      expire: generated.expire
    });

    return res.status(200).json({
      success: true,
      sent: true,
      paymentId: payment.id,
      email: data.email,
      expire: generated.expire
    });
  } catch (err) {
    console.error('[WEBHOOK] Erro:', err);

    return res.status(500).json({
      success: false,
      error: err.message || String(err)
    });
  }
};
