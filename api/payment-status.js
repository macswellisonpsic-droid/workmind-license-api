function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
    return {
      ok: false,
      statusCode: response.status,
      data,
    };
  }

  return {
    ok: true,
    statusCode: response.status,
    data,
  };
}

function getPaymentId(req) {
  return (
    req.query.payment_id ||
    req.query.collection_id ||
    req.query.id ||
    req.query['data.id'] ||
    ''
  );
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Método não permitido.',
    });
  }

  try {
    const paymentId = String(getPaymentId(req) || '').trim();

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'payment_id não informado.',
      });
    }

    const result = await getMercadoPagoPayment(paymentId);

    if (!result.ok) {
      return res.status(200).json({
        success: true,
        found: false,
        paymentId,
        status: 'unknown',
        approved: false,
        message: 'Ainda não foi possível consultar este pagamento.',
      });
    }

    const payment = result.data;
    const metadata = payment.metadata || {};

    return res.status(200).json({
      success: true,
      found: true,
      paymentId: String(payment.id || paymentId),
      status: payment.status || 'unknown',
      statusDetail: payment.status_detail || '',
      approved: payment.status === 'approved',
      pending: ['pending', 'in_process', 'authorized'].includes(payment.status),
      rejected: ['rejected', 'cancelled', 'refunded', 'charged_back'].includes(payment.status),
      email: metadata.email || metadata.customer_email || payment.payer?.email || '',
      planName: metadata.plan_name || '',
      orderId: metadata.order_id || payment.external_reference || '',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || String(err),
    });
  }
};
