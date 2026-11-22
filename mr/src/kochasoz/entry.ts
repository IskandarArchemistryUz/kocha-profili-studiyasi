/**
 * Kirish (22.11.2026, egasi: «har bir servisni bosganda oʻzini loyihalar paneli chiqsin — hozir eski loyihalar ochilib ketyapti»).
 * Loyihasiz (?p= yoʻq) ochilsa — xizmat yuklanmaydi, avval shu xizmatning oʻz loyihalari paneli (ui/svcpick → svcGate).
 */
import '../ui/ds2.css';
import { svcGate } from '../ui/svcpick';
svcGate('kochasoz', () => import('./main'));
