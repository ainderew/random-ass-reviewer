// Day boundaries in the user's timezone, without a timezone library.
// Intl gives us wall-clock parts for any zone; the offset falls out of that.

interface Parts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  const cached = formatters.get(timeZone);
  if (cached) return cached;
  let built: Intl.DateTimeFormat;
  try {
    built = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    // Unknown zone. Fall back to UTC rather than crash a payout.
    built = formatter('UTC');
  }
  formatters.set(timeZone, built);
  return built;
}

function partsAt(ms: number, timeZone: string): Parts {
  const parts: Partial<Parts> = {};
  for (const part of formatter(timeZone).formatToParts(new Date(ms))) {
    if (part.type === 'literal') continue;
    parts[part.type as keyof Parts] = Number(part.value);
  }
  return {
    year: parts.year ?? 1970,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    hour: parts.hour ?? 0,
    minute: parts.minute ?? 0,
    second: parts.second ?? 0,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

// 'YYYY-MM-DD' as the user would read it off their own clock.
export function localDayKey(ms: number, timeZone: string): string {
  const p = partsAt(ms, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

// The UTC instant of local midnight for the day containing `ms`.
export function startOfLocalDay(ms: number, timeZone: string): number {
  const day = partsAt(ms, timeZone);
  const naive = Date.UTC(day.year, day.month - 1, day.day);
  let guess = naive;
  // Two passes so a DST change at midnight settles on the right offset.
  for (let i = 0; i < 2; i += 1) {
    const p = partsAt(guess, timeZone);
    const asUtc = Date.UTC(
      p.year,
      p.month - 1,
      p.day,
      p.hour,
      p.minute,
      p.second,
    );
    guess = naive - (asUtc - guess);
  }
  return guess;
}

// Fractional hour of day, 0 to 23.999, on the user's own clock.
export function localHourOfDay(ms: number, timeZone: string): number {
  const p = partsAt(ms, timeZone);
  return p.hour + p.minute / 60 + p.second / 3600;
}
