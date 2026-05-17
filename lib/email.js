const { Resend } = require('resend');

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY não configurada na Vercel.');
  }

  return new Resend(process.env.RESEND_API_KEY);
}

async function sendLicenseEmail({
  to,
  customerName,
  planName,
  hwid,
  license,
  expiresAt,
  paymentId,
  orderId,
}) {
  if (!to) {
    throw new Error('E-mail do cliente ausente.');
  }

  if (!process.env.LICENSE_FROM_EMAIL) {
    throw new Error('LICENSE_FROM_EMAIL não configurado na Vercel.');
  }

  const resend = getResendClient();

  const safeName = escapeHtml(customerName || 'cliente');
  const safePlan = escapeHtml(planName || 'WorkMind PSI');
  const safeHwid = escapeHtml(hwid || '');
  const safeLicense = escapeHtml(license || '');
  const safeExpiresAt = escapeHtml(expiresAt || '');
  const safePaymentId = escapeHtml(paymentId || '');
  const safeOrderId = escapeHtml(orderId || '');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #1f2937;">
      <div style="background: linear-gradient(135deg, #22113d, #5b21b6); color: #ffffff; padding: 28px; border-radius: 18px 18px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">Sua licença WorkMind PSI foi gerada</h1>
        <p style="margin: 10px 0 0; opacity: .92;">Pagamento aprovado com sucesso.</p>
      </div>

      <div style="border: 1px solid #e5e7eb; border-top: 0; padding: 28px; border-radius: 0 0 18px 18px;">
        <p>Olá, <strong>${safeName}</strong>.</p>

        <p>
          Recebemos a confirmação do seu pagamento e sua licença da
          <strong>${safePlan}</strong> foi gerada automaticamente.
        </p>

        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 14px; padding: 18px; margin: 22px 0;">
          <p style="margin: 0 0 8px;"><strong>HWID vinculado:</strong> ${safeHwid}</p>
          <p style="margin: 0 0 8px;"><strong>Validade:</strong> ${safeExpiresAt}</p>
          <p style="margin: 0 0 8px;"><strong>Pagamento:</strong> ${safePaymentId}</p>
          <p style="margin: 0;"><strong>Pedido:</strong> ${safeOrderId}</p>
        </div>

        <p><strong>Chave de licença:</strong></p>

        <pre style="white-space: pre-wrap; word-break: break-word; background: #111827; color: #f9fafb; padding: 18px; border-radius: 14px; font-size: 14px;">${safeLicense}</pre>

        <p>
          Copie a chave acima e cole na tela de ativação da WorkMind PSI.
        </p>

        <p style="font-size: 13px; color: #6b7280; margin-top: 28px;">
          Esta licença é vinculada ao HWID informado no momento da compra.
        </p>
      </div>
    </div>
  `;

  const { data, error } = await resend.emails.send({
    from: process.env.LICENSE_FROM_EMAIL,
    to,
    replyTo: process.env.LICENSE_REPLY_TO || process.env.LICENSE_FROM_EMAIL,
    subject: 'Sua licença WorkMind PSI foi gerada',
    html,
  });

  if (error) {
    throw new Error(`Erro ao enviar e-mail pelo Resend: ${JSON.stringify(error)}`);
  }

  return data;
}

module.exports = {
  sendLicenseEmail,
};
