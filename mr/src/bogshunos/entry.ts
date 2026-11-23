/**
 * Kirish (23.11.2026, egasi: «har bir servisni bosganda oʻzini loyihalar paneli chiqsin»).
 * Loyihasiz (?p= yoʻq) ochilsa — Bogʻshunos yuklanmaydi, avval oʻz loyihalari paneli (ui/svcpick → svcGate).
 */
import { svcGate } from '../ui/svcpick';
svcGate('bogshunos', () => import('./main'));
