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

function generateLicense({ hwid, email, days, type }) {
  const cleanHwid = String(hwid || '').trim().replace(/['"]/g, '');
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanHwid || cleanHwid.length < 3) {
    throw new Error('HWID inválido.');
  }

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('E-mail inválido.');
  }

  const now = new Date();
  const expireDate = new Date(now);
  expireDate.setDate(expireDate.getDate() + Number(days || 0));

  const payload = JSON.stringify({
    hwid: cleanHwid,
    email: cleanEmail,
    expire: expireDate.toISOString(),
    type: type || 'LICENCA'
  });

  return {
    license: encrypt(payload),
    expire: expireDate.toISOString()
  };
}

module.exports = {
  generateLicense
};