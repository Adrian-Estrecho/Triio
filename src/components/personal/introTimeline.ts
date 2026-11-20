/** Timings (ms) shared by the name intro and the profile reveal behind it. */
export const NAME_START = 700;
export const STEP = 42;
const LETTER = 850;
const HOLD = 750;

export function introTimeline(name: string) {
  const n = Math.min(Array.from(name).length, 28);
  const nameEnd = NAME_START + Math.max(n - 1, 0) * STEP + LETTER - 250;
  const exit = Math.min(nameEnd + HOLD + 250, 3600);
  return { nameEnd, exit, reveal: exit + 260 };
}
