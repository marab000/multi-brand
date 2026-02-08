// const API_URL = 'ТВОЙ_GET_URL';

// export async function getProducts(): Promise<unknown> {
//   console.log('[API] Запрос на:', API_URL);

const res = await fetch(
	'https://tetrasis-bt.ru/download/073b52a2-88c8-11f0-a817-fa20ed40c5ae/6113540/0/'
	// BOSCH
);
//   console.log('[API] Статус:', res.status, res.statusText);
//   console.log('[API] Content-Type:', res.headers.get('content-type'));

//   const text = await res.text();

//   console.log('[API] Raw response:', text);

//   try {
//     const json = JSON.parse(text);
//     console.log('[API] Parsed JSON:', json);
//     return json;
//   } catch (e) {
//     console.error('[API] JSON parse error:', e);
//     throw new Error('Ответ не JSON');
//   }
// }
Bosch BEL620MB3