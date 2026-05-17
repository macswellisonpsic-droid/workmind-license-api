const crypto = require('crypto');

const SENHA_MESTRA = process.env.LICENSE_MASTER || 'WORKMIND2025';
const SALT = process.env.LICENSE_SALT || '123456';
const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.scryptSync(SENHA_MESTRA, SALT, 32);

function buildDeterministicIv(seed) {
  return crypto.createHash('sha256').update(String(seed || '')).digest().subarray(0, 16);
}

function encrypt(text, ivSeed) {
  const iv = ivSeed ? buildDeterministicIv(ivSeed) : crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);

  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + Number(days || 0));
  return result;
}

function normalizeDate(value, fallback) {
  const date = value ? new Date(value) : fallback;

  if (Number.isNaN(date.getTime())) {
    throw new Error('Data inválida na geração da licença.');
  }

  return date;
}

function generateLicense({ hwid, email, days, type, expireAt, paymentId, orderId, planId, issuedAt }) {
  const cleanHwid = String(hwid || '').trim().replace(/['"]/g, '');
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanHwid || cleanHwid.length < 3) {
    throw new Error('HWID inválido.');
  }

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('E-mail inválido.');
  }

  const issueDate = normalizeDate(issuedAt, new Date());
  const expireDate = expireAt ? normalizeDate(expireAt, null) : addDays(issueDate, Number(days || 0));

  if (Number.isNaN(expireDate.getTime())) {
    throw new Error('Data de expiração inválida.');
  }

  const normalizedPayload = {
    hwid: cleanHwid,
    email: cleanEmail,
    expire: expireDate.toISOString(),
    type: type || 'LICENCA',
    planId: planId || '',
    paymentId: paymentId || '',
    orderId: orderId || '',
    issuedAt: issueDate.toISOString(),
    product: 'WorkMind PSI',
  };

  const payload = JSON.stringify(normalizedPayload);

  const deterministicSeed = paymentId
    ? `workmind-psi-license:${paymentId}:${cleanEmail}:${cleanHwid}:${normalizedPayload.expire}:${normalizedPayload.type}`
    : '';

  return {
    license: encrypt(payload, deterministicSeed),
    expire: expireDate.toISOString(),
  };
}

module.exports = {
  generateLicense,
};
