export type XY = [number, number];
export type Phase = string[] | { arms: string[]; mv: Record<string, string> };
export interface Signal { cycle: number; phases: Phase[]; offset?: number; split?: number[] }
export interface Arm { id: string; j?: string; sig?: boolean; hin: XY; cross?: [XY, XY]; lanes: { id: string; pts: XY[]; codes: string; mid?: number; bus?: boolean; stops?: number[] }[]; exits: { id: string; pts: XY[]; mid?: number; bus?: boolean }[]; up?: { id: string; pts: XY[]; bus?: boolean; stops?: number[] }[] }
export interface Conn { id: string; from: string; to: string; m: 'L' | 'S' | 'R' | 'U'; pts: XY[] }
export interface Net { ring?: { c: XY; r: number } | null; juncs?: { id: string; signal?: Signal | null; ring?: { c: XY; r: number } | null; main?: string[]; stop?: string[]; rtor?: boolean }[]; links?: { from: string; to: string[] }[]; arms: Arm[]; conns: Conn[]; signal?: Signal | null; main?: string[]; yUp?: boolean }
export interface ArmRes { q95: number; n: number; flow: number; delay: number; los: string; queue: number }
export function autoConnect(arms: Arm[], yUp?: boolean): Conn[];
export const PAR_DEF: { a: number; b: number; T: number; s0: number; V0: number; len: number; alat: number; gapUns: number; gapSig: number; gapRing: number; gapRtor: number; pedV: number; uDiam: number; rtorStop: number; dwell: number };
export function uConn(e: Arm, dmin?: number): Omit<Conn, 'id'> | null;
export function uPath(A: XY, h: XY, B: XY): XY[];
export function connPath(A: XY, ha: XY, B: XY, hb: XY): XY[];
export function ringConnect(arms: Arm[], ring: { c: XY; r: number }, yUp?: boolean): Conn[];
export function autoPhases(arms: Arm[], opt?: { protLeft?: boolean | Set<string> }): Phase[];
export function opposingPairs(arms: Arm[]): [Arm, Arm][];
export function webster(arms: Arm[], phases: Phase[], flows: Record<string, number>, shares: { L: number; S: number; R: number }, opt?: { sat?: number; min?: number; max?: number; minG?: number }): { cycle: number; split: number[]; Y: number };
export function pointAt(pts: XY[], c: number[], s: number): number[];
export class GraphSim {
  constructor(net: Net, opt?: { demand?: Record<string, number>; shares?: { L: number; S: number; R: number; U?: number }; armShares?: Record<string, { L: number; S: number; R: number; U?: number }>; seed?: number; ped?: number; par?: Partial<typeof PAR_DEF>; bus?: Record<string, number>; busOcc?: number });
  P: { k: number; pos: number; walk: number; d: number }[];
  X: { A: XY; B: XY; L: number; u: XY; arm: string }[];
  pdone: { wait: number; t: number }[];
  conns: Conn[];
  pass: { arm: string; m: string; d: number; t: number }[];
  peds(): { x: number; y: number; walk: number }[];
  t: number;
  V: { id: number; li: number; s: number; v: number; arm: string; m: string; route: string[] }[];
  step(dt: number): void;
  run(sec: number, dt?: number): this;
  light(arm: string, t?: number, m?: string): 'G' | 'A' | 'R';
  sig: unknown;
  snapshot(): { id: number; x: number; y: number; h: number; m: string; v: number; len: number; bus: number }[];
  queues(): Record<string, number>;
  result(from?: number): { juncs: Record<string, { n: number; flow: number; delay: number; los: string }>; arms: Record<string, ArmRes>; total: { n: number; flow: number; delay: number; los: string }; ped: { n: number; flow: number; wait: number }; bus: { n: number; flow: number; delay: number }; person: number };
}
