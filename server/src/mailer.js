/* Kod yuboruvchi: «log» — sinov (kod jurnalga yoziladi), «smtp» — pochta (SMTP_URL, MAIL_FROM).
   SMS hali ulanmagan: telefon raqamiga kod soʻralsa — tushunarli xato. */
import nodemailer from 'nodemailer';
import { AuthError } from './auth.js';

const TEXT = {
  uz: { subj: (c) => `Archemistry Lab: kirish kodi ${c}`, body: (c) => `Kirish kodingiz: ${c}\n\nKod 10 daqiqa amal qiladi. Agar siz soʻramagan boʻlsangiz, bu xatni eʼtiborsiz qoldiring.\n\nArchemistry Lab · archemistry.uz` },
  en: { subj: (c) => `Archemistry Lab: sign-in code ${c}`, body: (c) => `Your sign-in code: ${c}\n\nThe code is valid for 10 minutes. If you did not request it, ignore this email.\n\nArchemistry Lab · archemistry.uz` },
  ru: { subj: (c) => `Archemistry Lab: код входа ${c}`, body: (c) => `Ваш код входа: ${c}\n\nКод действует 10 минут. Если вы его не запрашивали, проигнорируйте это письмо.\n\nArchemistry Lab · archemistry.uz` },
};
export const mailText = (lang, code) => { const t = TEXT[lang] ?? TEXT.uz; return { subject: t.subj(code), text: t.body(code) }; };

export function makeSender(kind, env = process.env, transport = null) {
  if (kind === 'log') return async (t, code) => console.log(`[OTP] ${t.kind} ${t.value}: ${code}`);
  if (kind === 'smtp') {
    if (!transport && !env.SMTP_URL) throw new Error('OTP_SENDER=smtp uchun SMTP_URL kerak');
    const tr = transport ?? nodemailer.createTransport(env.SMTP_URL);
    const from = env.MAIL_FROM || 'Archemistry Lab <kod@archemistry.uz>';
    return async (t, code, lang = 'uz') => {
      if (t.kind !== 'email') throw new AuthError('sms_off', 'hozircha faqat pochta orqali kirish mumkin');
      await tr.sendMail({ from, to: t.value, ...mailText(lang, code) });
    };
  }
  throw new Error(`OTP_SENDER=${kind} qoʻllab-quvvatlanmaydi (log | smtp)`);
}
