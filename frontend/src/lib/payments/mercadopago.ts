export type MPCheckoutOptions = {
  title: string;
  unit_price: number;
  quantity?: number;
  currency_id?: 'BRL' | 'USD' | 'EUR';
  external_reference?: string;
  metadata?: Record<string, any>;
};

export async function startMercadoPagoCheckout(opts: MPCheckoutOptions) {
  const {
    title,
    unit_price,
    quantity = 1,
    currency_id = 'BRL',
    external_reference,
    metadata,
  } = opts;

  const resp = await fetch('/api/checkout/mercadopago/preference', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, unit_price, quantity, currency_id, external_reference, metadata }),
  });
  const data = await resp.json();
  if (!resp.ok || !data.init_point) {
    throw new Error(data?.error || 'Falha ao criar preferência de pagamento');
  }
  const url = data.init_point || data.sandbox_init_point;
  window.location.href = url;
}