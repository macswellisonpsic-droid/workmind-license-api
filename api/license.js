const { generateLicense } = require('../lib/license');

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método não permitido.' });
  }

  try {
    const paymentId =
      req.query.payment_id ||
      req.query.collection_id ||
      req.query.id;

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        error: 'payment_id não informado.'
      });
    }

    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`
      }
    });

    const payment = await mpResponse.json();

    if (!mpResponse.ok) {
      return res.status(400).json({
        success: false,
        error: 'Não foi possível consultar o pagamento.',
        details: payment
      });
    }

    if (payment.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Pagamento ainda não aprovado.',
        status: payment.status
      });
    }

    const metadata = payment.metadata || {};

    const hwid = metadata.hwid;
    const email = metadata.email || payment.payer?.email;
    const days = Number(metadata.plan_days || 0);
    const type = metadata.plan_type || 'LICENCA';

    if (!hwid || !email || !days) {
      return res.status(400).json({
        success: false,
        error: 'Pagamento aprovado, mas os dados da licença estão incompletos.'
      });
    }

    const generated = generateLicense({
      hwid,
      email,
      days,
      type
    });

    return res.status(200).json({
      success: true,
      email,
      hwid,
      type,
      days,
      expire: generated.expire,
      license: generated.license
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || String(err)
    });
  }
};