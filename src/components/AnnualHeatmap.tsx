import { useMemo, useState } from "react";
import { AttendanceLog } from "../types";

interface AnnualHeatmapProps {
  attendanceList: AttendanceLog[];
  targetDays: number;
  academicYearLabel?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function getCellColor(hours: number): string {
  if (hours === 0) return "bg-slate-100";
  if (hours < 2) return "bg-emerald-200";
  if (hours < 4) return "bg-emerald-400";
  return "bg-emerald-600";
}

// Return the ISO date string for all days in the calendar year that contains the given date
function buildYearGrid(anchorDate: Date): Date[][] {
  // Start from January 1 of the current year
  const year = anchorDate.getFullYear();
  const jan1 = new Date(year, 0, 1);
  // Pad to previous Sunday
  const startOffset = jan1.getDay(); // 0=Sun
  const gridStart = new Date(jan1);
  gridStart.setDate(jan1.getDate() - startOffset);

  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
  // 53 weeks is enough to cover any full year
  for (let w = 0; w < 53; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    // Stop once we're past December 31
    if (cursor.getFullYear() > year) break;
  }
  return weeks;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function AnnualHeatmap({
  attendanceList,
  targetDays,
  academicYearLabel,
}: AnnualHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    date: string;
    hours: number;
    activities: string[];
    x: number;
    y: number;
  } | null>(null);

  const today = new Date();
  const year = today.getFullYear();

  // Build hours-per-day map from attendance logs for this year
  const dayMap = useMemo(() => {
    const m: Record<string, { hours: number; activities: string[] }> = {};
    attendanceList.forEach((log) => {
      if (!log.date.startsWith(String(year))) return;
      if (!m[log.date]) m[log.date] = { hours: 0, activities: [] };
      m[log.date].hours += log.hours;
      m[log.date].activities.push(log.activityType);
    });
    return m;
  }, [attendanceList, year]);

  const weeks = useMemo(() => buildYearGrid(today), [year]);

  // Count distinct logged days in this year
  const loggedDays = useMemo(
    () => Object.keys(dayMap).filter((d) => d.startsWith(String(year))).length,
    [dayMap, year]
  );

  const progressPct = Math.min(100, Math.round((loggedDays / targetDays) * 100));

  // Month label positions: find the first week index where each month starts
  const monthPositions = useMemo(() => {
    const positions: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, wi) => {
      const firstDayInYear = week.find((d) => d.getFullYear() === year);
      if (firstDayInYear) {
        const m = firstDayInYear.getMonth();
        if (m !== lastMonth) {
          positions.push({ label: MONTHS[m], col: wi });
          lastMonth = m;
        }
      }
    });
    return positions;
  }, [weeks, year]);

  const todayStr = isoDate(today);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-5 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display font-bold text-gray-900 text-base">
            Annual Learning Calendar
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {academicYearLabel ?? `${year} Academic Year`} — daily study hours heatmap
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-400">Less</span>
          {["bg-slate-100", "bg-emerald-200", "bg-emerald-400", "bg-emerald-600"].map((cls) => (
            <span key={cls} className={`w-3.5 h-3.5 rounded-sm inline-block ${cls} border border-black/5`} />
          ))}
          <span className="text-gray-400">More</span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block min-w-max">
          {/* Month labels */}
          <div className="flex ml-8 mb-1">
            {monthPositions.map(({ label, col }, i) => {
              const nextCol = monthPositions[i + 1]?.col ?? weeks.length;
              const span = nextCol - col;
              return (
                <div
                  key={label}
                  className="text-3xs text-gray-400 font-bold font-sans"
                  style={{ width: span * 16 }}
                >
                  {label}
                </div>
              );
            })}
          </div>

          <div className="flex gap-0.5">
            {/* Day of week labels */}
            <div className="flex flex-col gap-0.5 mr-1 justify-start pt-0.5">
              {DAY_LABELS.map((lbl, i) => (
                <div key={i} className="h-3 w-6 text-3xs text-gray-300 font-sans flex items-center justify-end pr-1">
                  {lbl}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => {
                  const ds = isoDate(day);
                  const isThisYear = day.getFullYear() === year;
                  const data = dayMap[ds];
                  const hours = data?.hours ?? 0;
                  const isToday = ds === todayStr;

                  return (
                    <div
                      key={di}
                      className={`w-3 h-3 rounded-sm transition cursor-default ${
                        !isThisYear ? "bg-transparent" : getCellColor(hours)
                      } ${isToday ? "ring-1 ring-indigo-500 ring-offset-1" : ""}`}
                      onMouseEnter={(e) => {
                        if (!isThisYear || !data) return;
                        const rect = (e.target as HTMLElement).getBoundingClientRect();
                        setTooltip({
                          date: ds,
                          hours,
                          activities: [...new Set(data.activities)],
                          x: rect.left + window.scrollX,
                          y: rect.top + window.scrollY,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Goal progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-gray-700">
            Annual Goal Progress
          </span>
          <span className="font-black text-indigo-700 font-mono">
            {loggedDays} / {targetDays} legal days logged
          </span>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-3xs text-gray-400 font-sans">
          <span>{progressPct}% complete</span>
          <span className={targetDays - loggedDays > 0 ? "text-amber-600 font-bold" : "text-emerald-600 font-bold"}>
            {targetDays - loggedDays > 0
              ? `${targetDays - loggedDays} days remaining to meet requirement`
              : "Annual goal met!"}
          </span>
        </div>
      </div>

      {/* Tooltip (portal-like, fixed) */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-slate-900 text-white text-xs rounded-xl px-3 py-2.5 shadow-2xl leading-relaxed"
          style={{ left: tooltip.x + 20, top: tooltip.y - 10 }}
        >
          <div className="font-bold">{tooltip.date}</div>
          <div className="text-emerald-300 font-mono">{tooltip.hours} hrs logged</div>
          {tooltip.activities.length > 0 && (
            <div className="text-slate-300 text-3xs mt-1">
              {tooltip.activities.join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
