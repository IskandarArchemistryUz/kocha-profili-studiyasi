/** Kirish talabi: 1–2-qadamlar ochiq, keyingilari — kirgan foydalanuvchiga (egasi rejimi — cheklovsiz) */
import { authRequired, FREE_STEPS } from './config';
import { check, current } from './session';
import { loginDialog } from './login';
import { isOwner } from '../core/wm';

export const needsLogin = (stepId?: string): boolean => authRequired() && !isOwner() && !current() && (stepId == null || !FREE_STEPS.includes(stepId));
/** Ruxsat bormi; yoʻq boʻlsa — kirish oynasi. true — davom etish mumkin */
export async function ensureLogin(stepId?: string, reason?: string): Promise<boolean> {
  if (!authRequired() || isOwner() || (stepId != null && FREE_STEPS.includes(stepId))) return true;
  if (current() || await check()) return true;
  return loginDialog(reason);
}
