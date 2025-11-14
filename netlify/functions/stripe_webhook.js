// Netlify Function: Stripe Webhook
// Verifies signature and updates subscription status in Supabase

const Stripe = require('stripe');
const { createAdminClient } = require('./_supabase.js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET' }),
    };
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });
  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  const rawBody = event.body; // Netlify provides raw string body

  let evt;
  try {
    evt = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid signature', details: String(err) }) };
  }

  const admin = createAdminClient();

  const mapStatus = (s) => {
    // Map Stripe status to our SubscriptionStatus
    switch (s) {
      case 'active':
      case 'trialing':
      case 'past_due':
      case 'canceled':
      case 'unpaid':
      case 'incomplete':
      case 'incomplete_expired':
      case 'paused':
        return s;
      default:
        return String(s || 'incomplete');
    }
  };

  try {
    switch (evt.type) {
      case 'checkout.session.completed': {
        const session = evt.data.object;
        const userId = session.client_reference_id || session.metadata?.user_id || session.metadata?.userId || null;
        const stripeCustomerId = session.customer || session.customer_id || null;
        const stripeSubscriptionId = session.subscription || null;
        const planName = session.metadata?.planName || session.metadata?.priceId || null;

        if (!userId || !stripeSubscriptionId) {
          // We need at least user linkage and subscription id
          break;
        }

        const { data: doctorRows, error: doctorErr } = await admin
          .from('doctors')
          .select('id')
          .eq('user_id', userId)
          .limit(1);
        if (doctorErr) throw doctorErr;
        const doctor = doctorRows && doctorRows[0];
        if (!doctor) {
          // If doctor does not exist, skip but acknowledge webhook
          break;
        }

        const { data: existing, error: subFetchErr } = await admin
          .from('subscriptions')
          .select('*')
          .eq('doctor_id', doctor.id)
          .limit(1);
        if (subFetchErr) throw subFetchErr;

        const payload = {
          doctor_id: doctor.id,
          plan_name: planName,
          stripe_customer_id: stripeCustomerId,
          stripe_subscription_id: stripeSubscriptionId,
          subscription_status: 'active',
        };

        if (existing && existing[0]) {
          const { error: updErr } = await admin
            .from('subscriptions')
            .update(payload)
            .eq('id', existing[0].id);
          if (updErr) throw updErr;
        } else {
          const { error: insErr } = await admin
            .from('subscriptions')
            .insert(payload);
          if (insErr) throw insErr;
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = evt.data.object;
        const status = mapStatus(sub.status);
        const stripeSubscriptionId = sub.id;
        const planName = (sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].price && sub.items.data[0].price.nickname) || null;

        const { data: rows, error: fetchErr } = await admin
          .from('subscriptions')
          .select('id')
          .eq('stripe_subscription_id', stripeSubscriptionId)
          .limit(1);
        if (fetchErr) throw fetchErr;
        if (rows && rows[0]) {
          const { error: updErr } = await admin
            .from('subscriptions')
            .update({ subscription_status: status, plan_name: planName })
            .eq('id', rows[0].id);
          if (updErr) throw updErr;
        }
        break;
      }

      default:
        // Ignore other event types
        break;
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Webhook processing error', details: String(err) }) };
  }
};