const crypto = require('crypto');

const SENHA_MESTRA = process.env.LICENSE_MASTER || 'WORKMIND2025';
const SALT = process.env.LICENSE_SALT || '123456';
const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = crypto.scryptSync(SENHA_MESTRA, SALT, 32);

function encrypt(text) {
  const iv = crypto.randomBytes(16);
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

function generateLicense({ hwid, email, days, type, expireAt, paymentId, orderId, planId }) {
  const cleanHwid = String(hwid || '').trim().replace(/['"]/g, '');
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanHwid || cleanHwid.length < 3) {
    throw new Error('HWID inválido.');
  }

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('E-mail inválido.');
  }

  const now = new Date();
  const expireDate = expireAt ? new Date(expireAt) : addDays(now, Number(days || 0));

  if (Number.isNaN(expireDate.getTime())) {
    throw new Error('Data de expiração inválida.');
  }

  const payload = JSON.stringify({
    hwid: cleanHwid,
    email: cleanEmail,
    expire: expireDate.toISOString(),
    type: type || 'LICENCA',
    planId: planId || '',
    paymentId: paymentId || '',
    orderId: orderId || '',
    issuedAt: now.toISOString(),
    product: 'WorkMind PSI',
  });

  return {
    license: encrypt(payload),
    expire: expireDate.toISOString(),
  };
}

module.exports = {
  generateLicense,
};
