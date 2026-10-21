/* Google bilan kirish: brauzer Google Identity Services orqali olgan ID tokenni tekshirish.
   Imzo — Google ochiq kalitlari (JWKS), auditoriya — bizning OAuth mijoz identifikatorimiz. */
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

/** @returns {(credential:string)=>Promise<{sub:string,email:string,email_verified:boolean,name?:string}>} */
export function makeGoogleVerifier(clientId, jwks = createRemoteJWKSet(JWKS_URL)) {
  return async (credential) => {
    if (typeof credential !== 'string' || credential.length > 4096) throw Object.assign(new Error('bad credential'), { google: true });
    const { payload } = await jwtVerify(credential, jwks, { issuer: ISSUERS, audience: clientId });
    return { sub: payload.sub, email: payload.email, email_verified: payload.email_verified === true, name: payload.name };
  };
}
