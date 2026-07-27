/**
 * Build a MongoDB createdAt range filter from common history query params.
 * Supported:
 * - date=YYYY-MM-DD
 * - month=YYYY-MM
 * - week=YYYY-Www (ISO week) or weekStart=YYYY-MM-DD
 * - from=ISO&to=ISO (inclusive calendar days when date-only)
 */
export function buildRideHistoryDateFilter(query = {}) {
  const { date, month, week, weekStart, from, to } = query;

  if (date) {
    const start = parseDayStart(date);
    if (!start) throw new Error("Invalid date. Use YYYY-MM-DD");
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { createdAt: { $gte: start, $lt: end } };
  }

  if (month) {
    const match = String(month).match(/^(\d{4})-(\d{2})$/);
    if (!match) throw new Error("Invalid month. Use YYYY-MM");
    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    if (monthIndex < 0 || monthIndex > 11) {
      throw new Error("Invalid month. Use YYYY-MM");
    }
    const start = new Date(Date.UTC(year, monthIndex, 1));
    const end = new Date(Date.UTC(year, monthIndex + 1, 1));
    return { createdAt: { $gte: start, $lt: end } };
  }

  if (week || weekStart) {
    const start = weekStart
      ? parseDayStart(weekStart)
      : parseIsoWeekStart(week);
    if (!start) {
      throw new Error(
        "Invalid week. Use week=YYYY-Www or weekStart=YYYY-MM-DD",
      );
    }
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 7);
    return { createdAt: { $gte: start, $lt: end } };
  }

  if (from || to) {
    const range = {};
    if (from) {
      const start = parseFlexibleDate(from, false);
      if (!start) throw new Error("Invalid from date");
      range.$gte = start;
    }
    if (to) {
      const end = parseFlexibleDate(to, true);
      if (!end) throw new Error("Invalid to date");
      range.$lte = end;
    }
    return { createdAt: range };
  }

  return {};
}

function parseDayStart(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function parseIsoWeekStart(week) {
  const match = String(week).match(/^(\d{4})-W(\d{2})$/i);
  if (!match) return null;
  const year = Number(match[1]);
  const weekNumber = Number(match[2]);
  if (weekNumber < 1 || weekNumber > 53) return null;

  // ISO week: week 1 contains Jan 4; Monday is first day.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (weekNumber - 1) * 7);
  return start;
}

function parseFlexibleDate(value, endOfDay) {
  const day = parseDayStart(value);
  if (day) {
    if (endOfDay) {
      day.setUTCHours(23, 59, 59, 999);
    }
    return day;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function summarizeRideStatuses(rides = []) {
  return rides.reduce(
    (acc, ride) => {
      if (ride.status === "completed") acc.completed += 1;
      else if (ride.status === "cancelled") acc.cancelled += 1;
      else if (ride.status === "missed") acc.missed += 1;
      return acc;
    },
    { completed: 0, cancelled: 0, missed: 0 },
  );
}
