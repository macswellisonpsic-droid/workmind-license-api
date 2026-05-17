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
        error: 'Não autorizado.'
      });
    }

    const email = String(req.query.email || '').trim().toLowerCase();
    const hwid = String(req.query.hwid || '').trim().replace(/['"]/g, '');
    const days = Number(req.query.days || 7);
    const type = String(req.query.type || 'TESTE').trim().toUpperCase();

    if (!email || !email.includes('@')) {
      return res.status(400).json({
        success: false,
        error: 'Informe um e-mail válido.'
      });
    }

    if (!hwid || hwid.length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Informe um HWID válido.'
      });
    }

    if (!Number.isInteger(days) || days <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Informe uma validade válida em dias.'
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