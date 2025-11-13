// Netlify Function: Mercado Pago Webhook (optional)
// Configure the notification URL in preference or account settings

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    console.log('Mercado Pago Webhook:', body);

    // TODO: validate signature if configured and update subscription/payment status in Supabase
    // Example: persist body in a table or call internal API

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }
}