export type XY = [number, number];
export interface Arm { id: string; sig?: boolean; hin: XY; lanes: { id: string; pts: XY[]; codes: string }[]; exits: { id: string; pts: XY[] }[] }
export interface Conn { id: string; from: string; to: string; m: 'L' | 'S' | 'R'; pts: XY[] }
export interface Net { arms: Arm[]; conns: Conn[]; signal?: { cycle: number; phases: string[][] } | null }
export interface ArmRes { n: number; flow: number; delay: number; los: string; queue: number }
export function autoPhases(arms: Arm[]): string[][];
export function pointAt(pts: XY[], c: number[], s: number): number[];
export class GraphSim {
  constructor(net: Net, opt?: { demand?: Record<string, number>; shares?: { L: number; S: number; R: number }; seed?: number });
  t: number;
  V: { id: number; li: number; s: number; v: number; arm: string; m: string; route: string[] }[];
  step(dt: number): void;
  run(sec: number, dt?: number): this;
  light(arm: string, t?: number): 'G' | 'A' | 'R';
  snapshot(): { id: number; x: number; y: number; h: number; m: string; v: number }[];
  queues(): Record<string, number>;
  result(from?: number): { arms: Record<string, ArmRes>; total: { n: number; flow: number; delay: number; los: string } };
}
