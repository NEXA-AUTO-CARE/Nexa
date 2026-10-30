import { useMemo, useState } from 'react'
import { Ban, CalendarX, ChevronLeft, ChevronRight, Unlock } from 'lucide-react'
import {
  BLOCKED_BOOKING_DATES_KEY,
  parseBlockedBookingDates,
  serializeBlockedBookingDates,
  toBusinessDateKey,
  type BlockedBookingDate,
} from '@nexa/shared'
import { api } from '../../lib/api-client'
import { useSettings } from '../../contexts/SettingsContext'

interface ScheduleBooking {
  bookingTime: string
  status: string
}

interface Props {
  bookings: ScheduleBooking[]
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const pad = (n: number) => String(n).padStart(2, '0')
const keyFor = (year: number, monthIndex: number, day: number) =>
  `${year}-${pad(monthIndex + 1)}-${pad(day)}`

const formatKey = (dateKey: string, opts: Intl.DateTimeFormatOptions) => {
  const [y, m, d] = dateKey.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', opts)
}

/**
 * Month-view schedule calendar for the admin dashboard. Shows booking counts per
 * day and lets admins block / unblock days so customers cannot book them.
 */
export default function AdminScheduleCalendar({ bookings }: Props) {
  const { blockedDates, refresh } = useSettings()
  const todayKey = toBusinessDateKey(new Date())

  const [viewMonth, setViewMonth] = useState(() => {
    const [y, m] = todayKey.split('-').map(Number)
    return { year: y, monthIndex: m - 1 }
  })
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const bookingCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const b of bookings) {
      if (b.status?.toLowerCase() === 'cancelled' || !b.bookingTime) continue
      const k = toBusinessDateKey(new Date(b.bookingTime))
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return counts
  }, [bookings])

  const blockedByDate = useMemo(
    () => new Map(blockedDates.map((b) => [b.date, b])),
    [blockedDates],
  )
  const upcomingBlocked = blockedDates.filter((b) => b.date >= todayKey)

  // Build Monday-first grid cells for the visible month
  const cells = useMemo(() => {
    const { year, monthIndex } = viewMonth
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
    const leading = (new Date(year, monthIndex, 1).getDay() + 6) % 7
    const out: (string | null)[] = Array.from({ length: leading }, () => null)
    for (let d = 1; d <= daysInMonth; d++) out.push(keyFor(year, monthIndex, d))
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [viewMonth])

  const monthLabel = new Date(viewMonth.year, viewMonth.monthIndex, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  const shiftMonth = (delta: number) => {
    setViewMonth(({ year, monthIndex }) => {
      const d = new Date(year, monthIndex + delta, 1)
      return { year: d.getFullYear(), monthIndex: d.getMonth() }
    })
  }

  const selectDay = (dateKey: string) => {
    setSelectedKey(dateKey)
    setReason('')
    setSaveError(null)
  }

  /** Re-read the latest list before writing to avoid clobbering another admin's change. */
  const persist = async (mutate: (list: BlockedBookingDate[]) => BlockedBookingDate[]) => {
    setSaving(true)
    setSaveError(null)
    try {
      const { data } = await api.get<{ key: string; value: string }>(
        `/settings/${BLOCKED_BOOKING_DATES_KEY}`,
      )
      const latest = parseBlockedBookingDates(data?.value)
      // Drop past days so the list doesn't grow forever
      const next = mutate(latest).filter((b) => b.date >= todayKey)
      await api.post(`/settings/${BLOCKED_BOOKING_DATES_KEY}`, {
        value: serializeBlockedBookingDates(next),
      })
      await refresh()
      setReason('')
    } catch (err) {
      console.error(err)
      setSaveError('Failed to update blocked days. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const blockDay = (dateKey: string) =>
    persist((list) => [
      ...list.filter((b) => b.date !== dateKey),
      reason.trim() ? { date: dateKey, reason: reason.trim() } : { date: dateKey },
    ])

  const unblockDay = (dateKey: string) =>
    persist((list) => list.filter((b) => b.date !== dateKey))

  const selectedBlocked = selectedKey ? blockedByDate.get(selectedKey) : undefined
  const selectedCount = selectedKey ? bookingCounts.get(selectedKey) ?? 0 : 0
  const selectedIsPast = !!selectedKey && selectedKey < todayKey

  return (
    <div className="glass-card p-6 border border-nexa-border-subtle space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-lg text-nexa-text">Schedule Calendar</h2>
          <p className="text-xs text-nexa-text-secondary">
            Click a day to block or unblock it. Customers cannot book blocked days.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftMonth(-1)}
            className="p-1.5 rounded-lg border border-nexa-border-subtle text-nexa-text-secondary hover:text-nexa-text"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-nexa-text w-36 text-center">{monthLabel}</span>
          <button
            onClick={() => shiftMonth(1)}
            className="p-1.5 rounded-lg border border-nexa-border-subtle text-nexa-text-secondary hover:text-nexa-text"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-[10px] font-bold uppercase tracking-wider text-nexa-text-muted py-1">
            {d}
          </div>
        ))}
        {cells.map((dateKey, i) => {
          if (!dateKey) return <div key={`empty-${i}`} />
          const isPast = dateKey < todayKey
          const isToday = dateKey === todayKey
          const isBlocked = blockedByDate.has(dateKey)
          const isSelected = dateKey === selectedKey
          const count = bookingCounts.get(dateKey) ?? 0
          return (
            <button
              key={dateKey}
              onClick={() => selectDay(dateKey)}
              title={isBlocked ? blockedByDate.get(dateKey)?.reason || 'Blocked' : undefined}
              className={`relative min-h-[56px] rounded-xl border p-1.5 text-left transition-all duration-200 ${
                isBlocked
                  ? 'border-red-500/40 bg-red-500/10'
                  : 'border-nexa-border-subtle bg-nexa-bg hover:border-nexa-mint/30'
              } ${isSelected ? 'ring-2 ring-nexa-mint/60' : ''} ${isPast ? 'opacity-40' : ''}`}
            >
              <span
                className={`text-xs font-semibold ${
                  isToday ? 'text-nexa-mint' : isBlocked ? 'text-red-400' : 'text-nexa-text'
                }`}
              >
                {Number(dateKey.slice(8))}
              </span>
              {isBlocked && <Ban className="absolute top-1.5 right-1.5 w-3 h-3 text-red-400" />}
              {count > 0 && (
                <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold px-1.5 rounded-full bg-nexa-mint/15 text-nexa-mint">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-4 text-[10px] text-nexa-text-muted">
        <span className="flex items-center gap-1">
          <span className="px-1.5 rounded-full bg-nexa-mint/15 text-nexa-mint font-bold">n</span> bookings
        </span>
        <span className="flex items-center gap-1">
          <Ban className="w-3 h-3 text-red-400" /> blocked day
        </span>
      </div>

      {selectedKey && (
        <div className="rounded-xl border border-nexa-border-subtle bg-nexa-bg-deep p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-nexa-text">
                {formatKey(selectedKey, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
              <p className="text-xs text-nexa-text-secondary">
                {selectedCount} active booking{selectedCount === 1 ? '' : 's'}
                {selectedBlocked && ' · Blocked'}
                {selectedBlocked?.reason && ` (${selectedBlocked.reason})`}
              </p>
            </div>
            {selectedIsPast ? (
              <span className="text-xs text-nexa-text-muted">Past days can't be changed.</span>
            ) : selectedBlocked ? (
              <button
                onClick={() => unblockDay(selectedKey)}
                disabled={saving}
                className="flex items-center gap-2 py-2 px-4 rounded-xl border border-nexa-mint/30 text-nexa-mint text-xs font-bold hover:bg-nexa-mint/10 disabled:opacity-50"
              >
                <Unlock className="w-4 h-4" />
                {saving ? 'Saving…' : 'Unblock day'}
              </button>
            ) : null}
          </div>

          {!selectedIsPast && !selectedBlocked && (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={reason}
                maxLength={120}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (optional, internal), e.g. Staff holiday"
                className="flex-1 bg-nexa-bg border border-nexa-border-subtle text-nexa-text rounded-xl p-2.5 text-xs focus:ring-0 focus:border-nexa-mint/40"
              />
              <button
                onClick={() => blockDay(selectedKey)}
                disabled={saving}
                className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/25 disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                {saving ? 'Saving…' : 'Block day'}
              </button>
            </div>
          )}

          {!selectedIsPast && !selectedBlocked && selectedCount > 0 && (
            <p className="text-[11px] text-amber-400">
              This day already has {selectedCount} booking{selectedCount === 1 ? '' : 's'}. Blocking only stops new
              bookings; existing ones are not cancelled or moved.
            </p>
          )}
          {saveError && <p className="text-[11px] text-red-400">{saveError}</p>}
        </div>
      )}

      {upcomingBlocked.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-nexa-text-muted flex items-center gap-1">
            <CalendarX className="w-3.5 h-3.5" /> Upcoming blocked days
          </p>
          <div className="flex flex-wrap gap-2">
            {upcomingBlocked.map((b) => (
              <button
                key={b.date}
                onClick={() => {
                  const [y, m] = b.date.split('-').map(Number)
                  setViewMonth({ year: y, monthIndex: m - 1 })
                  selectDay(b.date)
                }}
                className="text-[11px] px-2.5 py-1 rounded-full border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
              >
                {formatKey(b.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                {b.reason ? ` · ${b.reason}` : ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
