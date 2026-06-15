import { toDisplayPrice } from '$lib/utils/formatPrice';

const OTP_CONFIG = {
  OTP_FORM_URL: 'https://ecom.otpbank.ru/smart-form',
  OTP_API_URL: 'https://ecom.otpbank.ru/smart-form-link/v1/configurations'
};

export type OtpCartItem = {
  name: string;
  price: number | string | null | undefined;
  quantity: number;
};

export type OpenOtpParams = {
  cart: OtpCartItem[];
};

export async function openOtp(params: OpenOtpParams) {
  const goods = params.cart.map((i) => ({
    name: i.name,
    price: toDisplayPrice(i.price),
    quantity: i.quantity
  }));

  try {
    const res = await fetch(OTP_CONFIG.OTP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopCode: 'POS-04579-26-000001',
        creditPeriodFrom: 6,
        creditPeriodTo: 36,
        productCodes: ['PKP249M6_36'],
        goods,
        agent: 'ppu320716725',
        creditType: '2'
      })
    });

    const data = await res.json();

    if (!data?.id) throw new Error('OTP config id missing');

    const url = new URL(OTP_CONFIG.OTP_FORM_URL);
    url.searchParams.set('config', data.id);

    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  } catch (e) {
    console.error('OTP error:', e);
  }
}