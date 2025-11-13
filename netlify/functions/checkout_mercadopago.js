// Netlify Function: Create Mercado Pago Checkout Preference
// Uses Access Token for server-side authentication

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
    if (!MP_ACCESS_TOKEN) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'MP_ACCESS_TOKEN is not set' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const {
      title = 'Sisdental — Assinatura',
      quantity = 1,
      unit_price = 0,
      currency_id = 'BRL',
      external_reference,
      metadata,
      back_urls,
      origin,
    } = body;

    const siteUrl = origin || process.env.URL || process.env.DEPLOY_URL || 'https://sisdental.netlify.app';
    const success = back_urls?.success || `${siteUrl}/checkout-success`;
    const failure = back_urls?.failure || `${siteUrl}/pricing`;
    const pending = back_urls?.pending || `${siteUrl}/pricing`;

    const payload = {
      items: [{ title, quantity: Number(quantity), unit_price: Number(unit_price), currency_id }],
      back_urls: { success, failure, pending },
      auto_return: 'approved',
    };
    if (external_reference) payload.external_reference = external_reference;
    if (metadata && typeof metadata === 'object') payload.metadata = metadata;

    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let data;
    try {
      data = await resp.json();
    } catch (e) {
      data = { error: 'Invalid response from Mercado Pago' };
    }

    if (!resp.ok) {
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: 'Failed to create preference', details: data }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ id: data.id, init_point: data.init_point, sandbox_init_point: data.sandbox_init_point }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Exception creating preference', details: String(e) }),
    };
  }
}