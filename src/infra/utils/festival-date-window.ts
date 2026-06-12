export type FestivalDateWindow = {
  windowStart: Date;
  windowEnd: Date;
};

/** Janela da festa: 18h do dia até 05h do dia seguinte (UTC-3). */
export function getFestivalDateWindow(day: string): FestivalDateWindow {
  const windowStart = new Date(`${day}T18:00:00-03:00`);
  const nextDay = new Date(day);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().slice(0, 10);
  const windowEnd = new Date(`${nextDayStr}T05:00:00-03:00`);
  return { windowStart, windowEnd };
}
