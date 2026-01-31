// import { fail, redirect } from '@sveltejs/kit';
// import { auth } from '$lib/server/auth';

// export const actions = {
//   default: async ({ request }) => {
//     const data = await request.formData();

//     const email = data.get('email');
//     const password = data.get('password');

//     if (typeof email !== 'string' || typeof password !== 'string') {
//       return fail(400, { error: 'Неверные данные' });
//     }

//     try {
//       const session = await auth.createSession({
//         providerId: 'email',
//         providerUserId: email,
//         password
//       });

//       throw redirect(302, '/admin');
//     } catch (e) {
//       return fail(400, { error: 'Неверный email или пароль' });
//     }
//   }
// };
