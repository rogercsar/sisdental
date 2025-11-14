// Netlify Function: Create Mercado Pago Checkout Preference
// Uses Access Token for server-side authentication

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  const tryStripeFallback = async (opts, siteUrl) => {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    const priceId = opts?.metadata?.priceId;
    if (!STRIPE_SECRET_KEY || !priceId) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Mercado Pago failed and Stripe fallback is not configured (missing STRIPE_SECRET_KEY or metadata.priceId)' }),
      };
    }

    const form = new URLSearchParams();
    form.append('mode', 'subscription');
    form.append('success_url', `${siteUrl}/checkout-success?provider=stripe&session_id={CHECKOUT_SESSION_ID}`);
    form.append('cancel_url', `${siteUrl}/pricing`);
    form.append('line_items[0][price]', priceId);
    form.append('line_items[0][quantity]', '1');
    const userId = opts?.metadata?.userId || opts?.metadata?.user_id;
    if (userId) {
      form.append('client_reference_id', userId);
      form.append('metadata[user_id]', userId);
    }

    try {
      const sresp = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      });
      let sdata;
      try {
        sdata = await sresp.json();
      } catch (e) {
        sdata = { error: 'Invalid response from Stripe' };
      }
      if (!sresp.ok || !sdata.url) {
        return {
          statusCode: sresp.status || 500,
          body: JSON.stringify({ error: 'Failed to create Stripe checkout session', details: sdata }),
        };
      }
      // Simular mesma estrutura retornada pelo MP para o frontend
      return {
        statusCode: 200,
        body: JSON.stringify({ init_point: sdata.url, provider: 'stripe' }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Exception creating Stripe session', details: String(err) }),
      };
    }
  };

  try {
    const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
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

    if (!MP_ACCESS_TOKEN) {
      // Fallback imediato para Stripe se MP não estiver configurado
      return await tryStripeFallback({ metadata }, siteUrl);
    }

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
      // Fallback para Stripe quando Mercado Pago falha
      const fallback = await tryStripeFallback({ metadata }, siteUrl);
      if (fallback.statusCode === 200) return fallback;
      return {
        statusCode: resp.status,
        body: JSON.stringify({ error: 'Failed to create preference', details: data }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ id: data.id, init_point: data.init_point, sandbox_init_point: data.sandbox_init_point, provider: 'mercadopago' }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Exception creating preference', details: String(e) }),
    };
  }
}