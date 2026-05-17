const { generateLicense } = require('../lib/license');
const { sendLicenseEmail } = require('../lib/email');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function getBody(req) {
  if (typeof req.body === 'object' && req.body !== null) return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  return {};
}

function getPaymentId(req, body) {
  return (
    body?.data?.id ||
    body?.id ||
    req.query?.['data.id'] ||
    req.query?.id ||
    req.query?.payment_id ||
    req.query?.collection_id ||
    ''
  );
}

function getTopic(req, body) {
  return body?.type || body?.topic || req.query?.type || req.query?.topic || '';
}

function formatDateBR(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function normalizeMetadata(payment) {
  const metadata = payment?.metadata || {};

  return {
    orderId: metadata.order_id || payment?.external_reference || '',
    customerName:
      metadata.customer_name ||
      metadata.nome ||
      metadata.name ||
      payment?.payer?.first_name ||
      'Cliente',
    email:
      metadata.email ||
      metadata.customer_email ||
      payment?.payer?.email ||
      '',
    whatsapp: metadata.whatsapp || metadata.phone || '',
    hwid: metadata.hwid || metadata.machine_id || metadata.hardware_id || '',
    planId: metadata.plan_id || metadata.plan || '',
    planName: metadata.plan_name || metadata.plan_label || 'WorkMind PSI',
    planType: metadata.plan_type || metadata.type || 'LICENCA',
    days: Number(metadata.plan_days || metadata.days || metadata.validity_days || 0),
    coupon: metadata.coupon_code || metadata.coupon || metadata.cupom || '',
  };
}

async function getMercadoPagoPayment(paymentId) {
  if (!process.env.MP_ACCESS_TOKEN) {
    throw new Error('MP_ACCESS_TOKEN não configurado na Vercel.');
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Não foi possível consultar o pagamento no Mercado Pago: ${JSON.stringify(data)}`);
  }

  return data;
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      route: 'webhook',
      message: 'Webhook WorkMind PSI ativo. Use POST para notificações do Mercado Pago.',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Método não permitido.',
    });
  }

  try {
    const token = String(req.query.token || '');

    if (process.env.WEBHOOK_TOKEN && token !== process.env.WEBHOOK_TOKEN) {
      return res.status(401).json({
        success: false,
        error: 'Webhook não autorizado.',
      });
    }

    const body = getBody(req);
    const topic = getTopic(req, body);
    const paymentId = String(getPaymentId(req, body));

    console.log('[WEBHOOK] Recebido:', {
      topic,
      paymentId,
      query: req.query,
      body,
    });

    if (topic && topic !== 'payment') {
      return res.status(200).json({
        success: true,
        ignored: true,
        reason: 'Evento ignorado porque não é payment.',
        topic,
      });
    }

    if (!paymentId) {
      return res.status(200).json({
        success: true,
        ignored: true,
        reason: 'Webhook recebido sem paymentId.',
      });
    }

    // O botão de simulação do Mercado Pago costuma enviar data.id = "123456",
    // que não é um pagamento real e não pode ser consultado na API de pagamentos.
    // Neste caso, respondemos 200 para validar a URL do webhook sem tentar gerar licença.
    if (String(paymentId) === '123456' && body?.live_mode === false) {
      console.log('[WEBHOOK] Simulação do Mercado Pago recebida com sucesso.');

      return res.status(200).json({
        success: true,
        simulated: true,
        ignored: true,
        reason: 'Simulação do Mercado Pago recebida. Nenhuma licença foi gerada.',
      });
    }

    let payment;

    try {
      payment = await getMercadoPagoPayment(paymentId);
    } catch (paymentError) {
      console.error('[WEBHOOK] Falha ao consultar pagamento:', paymentError);

      // Não retornamos 500 para IDs inexistentes enviados em testes/notificações inválidas,
      // pois isso faz o Mercado Pago marcar a URL como quebrada. Erros reais de configuração,
      // como MP_ACCESS_TOKEN ausente, continuam caindo no catch principal como 500.
      if (!process.env.MP_ACCESS_TOKEN) {
        throw paymentError;
      }

      return res.status(200).json({
        success: true,
        ignored: true,
        paymentId,
        reason: 'Não foi possível consultar este pagamento. Pode ser uma simulação ou ID inválido.',
      });
    }

    console.log('[WEBHOOK] Pagamento consultado:', {
      id: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      external_reference: payment.external_reference,
      metadata: payment.metadata,
    });

    if (payment.status !== 'approved') {
      return res.status(200).json({
        success: true,
        ignored: true,
        paymentId: payment.id,
        status: payment.status,
        reason: 'Pagamento ainda não aprovado.',
      });
    }

    const data = normalizeMetadata(payment);

    if (!data.email) {
      throw new Error('Pagamento aprovado, mas sem e-mail na metadata ou no payer.');
    }

    if (!data.hwid) {
      throw new Error('Pagamento aprovado, mas sem HWID na metadata.');
    }

    if (!data.days || data.days <= 0) {
      throw new Error('Pagamento aprovado, mas sem validade da licença na metadata.');
    }

    const generated = generateLicense({
      hwid: data.hwid,
      email: data.email,
      days: data.days,
      type: data.planType,
      paymentId: String(payment.id),
      orderId: data.orderId,
      planId: data.planId,
    });

    await sendLicenseEmail({
      to: data.email,
      customerName: data.customerName,
      customerEmail: data.email,
      planName: data.planName,
      hwid: data.hwid,
      license: generated.license,
      expiresAt: formatDateBR(new Date(generated.expire)),
      paymentId: String(payment.id),
      orderId: data.orderId,
    });

    console.log('[WEBHOOK] Licença enviada com sucesso:', {
      paymentId: payment.id,
      email: data.email,
      hwid: data.hwid,
      planId: data.planId,
      expire: generated.expire,
    });

    return res.status(200).json({
      success: true,
      sent: true,
      paymentId: payment.id,
      status: payment.status,
      email: data.email,
      expire: generated.expire,
    });
  } catch (err) {
    console.error('[WEBHOOK] Erro:', err);

    return res.status(500).json({
      success: false,
      error: err.message || String(err),
    });
  }
};
