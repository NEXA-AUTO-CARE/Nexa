import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  BookingStatus,
  PaymentStatus,
  ServiceType,
  type ReportDateField,
  type ReportGroupBy,
  type ReportingAnalyticsResponse,
  type ReportingQueryParams,
} from '@nexa/shared'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertTriangle,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  MapPin,
  Percent,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useToast } from '@/hooks/use-toast'
import { describeError } from '@/lib/errors'
import {
  BOOKING_CSV_COLUMN_DEFINITIONS,
  downloadBookingsCsv,
  downloadBookingsExcel,
  downloadBookingsPdf,
  downloadVendorsCsv,
  downloadVendorsExcel,
  fetchReportingAnalytics,
  fetchReportingBookings,
  type BookingCsvColumnKey,
} from '@/lib/reporting-api'

const CHART_COLORS = ['#66ffd1', '#38bdf8', '#a78bfa', '#fbbf24', '#fb7185', '#34d399']

const ESSENTIAL_FINANCE_COLUMNS: BookingCsvColumnKey[] = [
  'bookingReference',
  'createdAt',
  'bookingTime',
  'status',
  'paymentStatus',
  'serviceType',
  'customerName',
  'vendorName',
  'originalPrice',
  'discountAmount',
  'finalPrice',
  'platformFee',
  'vendorPayout',
  'stripePaymentIntentId',
]

const OPERATIONS_COLUMNS: BookingCsvColumnKey[] = [
  'bookingReference',
  'bookingTime',
  'status',
  'paymentStatus',
  'serviceType',
  'vehicleSummary',
  'customerName',
  'customerPhone',
  'serviceAddress',
  'postcode',
  'addons',
  'vendorName',
  'vendorCompany',
]

type DatePresetKey = '7d' | '30d' | '90d' | 'mtd' | 'all'
type ReportTabKey = 'bookings' | 'vendors' | 'addons_geo' | 'mix'

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getPresetDates(preset: DatePresetKey): { startDate: string; endDate: string } {
  const now = new Date()
  const endDate = formatDateInput(now)

  if (preset === 'all') {
    return { startDate: '', endDate: '' }
  }
  if (preset === 'mtd') {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    return { startDate: formatDateInput(start), endDate }
  }
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90
  const start = new Date(now)
  start.setUTCDate(start.getUTCDate() - (days - 1))
  return { startDate: formatDateInput(start), endDate }
}

function formatGbp(value: number | string): string {
  const num = typeof value === 'number' ? value : parseFloat(value || '0')
  return `£${(Number.isNaN(num) ? 0 : num).toFixed(2)}`
}

const STATUS_BADGE: Record<string, string> = {
  booked: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  assigned: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  accepted: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  in_progress: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  completed: 'bg-nexa-mint/15 text-nexa-mint border-nexa-mint/30',
  cancelled: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
}

const PAYMENT_BADGE: Record<string, string> = {
  captured: 'bg-nexa-mint/15 text-nexa-mint border-nexa-mint/30',
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  processing: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  failed: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  refunded: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
}

export default function AdminReportingPage() {
  const { toast } = useToast()

  const initialRange = useMemo(() => getPresetDates('30d'), [])

  // Filter state
  const [activePreset, setActivePreset] = useState<DatePresetKey>('30d')
  const [startDate, setStartDate] = useState(initialRange.startDate)
  const [endDate, setEndDate] = useState(initialRange.endDate)
  const [groupBy, setGroupBy] = useState<ReportGroupBy>('day')
  const [dateField, setDateField] = useState<ReportDateField>('bookingTime')
  const [status, setStatus] = useState<string>('')
  const [paymentStatus, setPaymentStatus] = useState<string>('')
  const [serviceType, setServiceType] = useState<string>('')
  const [vendorId, setVendorId] = useState<string>('')
  const [postcode, setPostcode] = useState<string>('')
  const [searchInput, setSearchInput] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')
  const [page, setPage] = useState(1)
  const limit = 20

  // UI state
  const [activeTab, setActiveTab] = useState<ReportTabKey>('bookings')
  const [showColumnPicker, setShowColumnPicker] = useState(false)
  const [selectedColumns, setSelectedColumns] = useState<BookingCsvColumnKey[]>(() =>
    BOOKING_CSV_COLUMN_DEFINITIONS.map((c) => c.key),
  )

  // Data state
  const [data, setData] = useState<ReportingAnalyticsResponse | null>(null)
  const [bookingsPage, setBookingsPage] = useState<ReportingAnalyticsResponse['bookings'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [exportingFormat, setExportingFormat] = useState<
    null | 'csv' | 'excel' | 'pdf' | 'vendors-csv' | 'vendors-excel'
  >(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const baseQueryParams = useMemo<ReportingQueryParams>(
    () => ({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      groupBy,
      dateField,
      status: (status || undefined) as BookingStatus | undefined,
      paymentStatus: (paymentStatus || undefined) as PaymentStatus | undefined,
      serviceType: (serviceType || undefined) as ServiceType | undefined,
      vendorId: vendorId || undefined,
      postcode: postcode.trim() || undefined,
      search: debouncedSearch || undefined,
    }),
    [
      startDate,
      endDate,
      groupBy,
      dateField,
      status,
      paymentStatus,
      serviceType,
      vendorId,
      postcode,
      debouncedSearch,
    ],
  )

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetchReportingAnalytics({
        ...baseQueryParams,
        page: 1,
        limit,
      })
      setData(res)
      setBookingsPage(res.bookings)
      setPage(res.bookings.page)
    } catch (err) {
      const msg = describeError(err, 'Failed to load reporting analytics.')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [baseQueryParams])

  useEffect(() => {
    let cancelled = false
    fetchReportingAnalytics({
      ...baseQueryParams,
      page: 1,
      limit,
    })
      .then((res) => {
        if (cancelled) return
        setError(null)
        setData(res)
        setBookingsPage(res.bookings)
        setPage(res.bookings.page)
      })
      .catch((err) => {
        if (cancelled) return
        setError(describeError(err, 'Failed to load reporting analytics.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [baseQueryParams])

  const handlePageChange = async (nextPage: number) => {
    if (nextPage < 1 || (bookingsPage && nextPage > bookingsPage.totalPages)) return
    try {
      setTableLoading(true)
      const res = await fetchReportingBookings({
        ...baseQueryParams,
        page: nextPage,
        limit,
      })
      setBookingsPage(res)
      setPage(res.page)
    } catch (err) {
      toast({
        title: 'Failed to load page',
        description: describeError(err, 'Could not fetch booking rows.'),
        variant: 'destructive',
      })
    } finally {
      setTableLoading(false)
    }
  }

  const handlePresetSelect = (preset: DatePresetKey) => {
    setActivePreset(preset)
    const range = getPresetDates(preset)
    setStartDate(range.startDate)
    setEndDate(range.endDate)
    if (preset === '90d') setGroupBy('week')
    else if (preset === 'all') setGroupBy('month')
    else setGroupBy('day')
    setPage(1)
  }

  const handleResetFilters = () => {
    const range = getPresetDates('30d')
    setActivePreset('30d')
    setStartDate(range.startDate)
    setEndDate(range.endDate)
    setGroupBy('day')
    setDateField('bookingTime')
    setStatus('')
    setPaymentStatus('')
    setServiceType('')
    setVendorId('')
    setPostcode('')
    setSearchInput('')
    setDebouncedSearch('')
    setPage(1)
  }

  const toggleColumn = (key: BookingCsvColumnKey) => {
    setSelectedColumns((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev
        return prev.filter((k) => k !== key)
      }
      const order = BOOKING_CSV_COLUMN_DEFINITIONS.map((c) => c.key)
      return [...prev, key].sort((a, b) => order.indexOf(a) - order.indexOf(b))
    })
  }

  const runExport = async (
    format: 'csv' | 'excel' | 'pdf' | 'vendors-csv' | 'vendors-excel',
  ) => {
    try {
      setExportingFormat(format)
      const paramsWithCols: ReportingQueryParams = {
        ...baseQueryParams,
        columns: selectedColumns.join(','),
      }
      if (format === 'csv') {
        const { filename, rowCount } = await downloadBookingsCsv(paramsWithCols)
        toast({
          title: 'CSV Report Exported',
          description: `Downloaded ${rowCount} booking record(s) to ${filename}.`,
        })
      } else if (format === 'excel') {
        const { filename, rowCount } = await downloadBookingsExcel(paramsWithCols)
        toast({
          title: 'Excel Workbook Exported',
          description: `Downloaded ${rowCount} filtered booking(s) & analytics sheets to ${filename}.`,
        })
      } else if (format === 'pdf') {
        const { filename, rowCount } = await downloadBookingsPdf(paramsWithCols)
        toast({
          title: 'PDF Report Downloaded',
          description: `Downloaded filtered report (${rowCount} booking(s)) to ${filename}.`,
        })
      } else if (format === 'vendors-csv') {
        const { filename, rowCount } = await downloadVendorsCsv(baseQueryParams)
        toast({
          title: 'Vendor CSV Exported',
          description: `Downloaded ${rowCount} vendor row(s) to ${filename}.`,
        })
      } else {
        const { filename, rowCount } = await downloadVendorsExcel(baseQueryParams)
        toast({
          title: 'Vendor Excel Exported',
          description: `Downloaded ${rowCount} vendor row(s) to ${filename}.`,
        })
      }
    } catch (err) {
      toast({
        title: 'Export Failed',
        description: describeError(err, 'Unable to generate report export.'),
        variant: 'destructive',
      })
    } finally {
      setExportingFormat(null)
    }
  }

  const kpis = data?.kpis
  const vendorOptions = data?.vendorPerformance ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 pb-10"
    >
      {/* HEADER + PRIMARY EXPORT ACTIONS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-nexa-mint/15 border border-nexa-mint/25 flex items-center justify-center text-nexa-mint">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display font-bold text-3xl text-nexa-text tracking-tight">
                Reporting & Analytics
              </h1>
              <p className="text-nexa-text-secondary text-sm">
                Commercial performance, detailer utilization, and filtered CSV, Excel & PDF exports.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowColumnPicker((v) => !v)}
            className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
              showColumnPicker
                ? 'bg-nexa-mint/15 border-nexa-mint/40 text-nexa-mint'
                : 'bg-nexa-bg-elevated/60 border-nexa-border-subtle text-nexa-text-secondary hover:text-nexa-text hover:border-nexa-mint/30'
            }`}
          >
            <Columns3 className="w-4 h-4" />
            <span>Columns ({selectedColumns.length}/{BOOKING_CSV_COLUMN_DEFINITIONS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => runExport('vendors-csv')}
            disabled={exportingFormat !== null || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg-elevated/60 hover:border-nexa-mint/30 text-nexa-text text-xs font-semibold transition-all disabled:opacity-50"
          >
            {exportingFormat === 'vendors-csv' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Store className="w-4 h-4 text-amber-400" />
            )}
            <span>Vendors CSV</span>
          </button>

          <button
            type="button"
            onClick={() => runExport('vendors-excel')}
            disabled={exportingFormat !== null || loading}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg-elevated/60 hover:border-emerald-400/40 text-nexa-text text-xs font-semibold transition-all disabled:opacity-50"
          >
            {exportingFormat === 'vendors-excel' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            )}
            <span>Vendors Excel</span>
          </button>

          <button
            type="button"
            onClick={() => runExport('csv')}
            disabled={exportingFormat !== null || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-nexa-mint text-nexa-text-dark hover:bg-nexa-mint-hover font-bold text-xs shadow-[0_0_20px_rgba(102,255,209,0.2)] transition-all disabled:opacity-50 cursor-pointer"
          >
            {exportingFormat === 'csv' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              Export CSV
              {bookingsPage ? ` (${bookingsPage.total})` : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={() => runExport('excel')}
            disabled={exportingFormat !== null || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-400/35 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {exportingFormat === 'excel' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={() => runExport('pdf')}
            disabled={exportingFormat !== null || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-sky-400/35 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {exportingFormat === 'pdf' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* CUSTOMIZABLE EXPORT COLUMN PICKER */}
      {showColumnPicker && (
        <div className="glass-card p-5 border border-nexa-mint/25 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-sm text-nexa-text">
                Customize Export Columns
              </h3>
              <p className="text-xs text-nexa-text-secondary">
                Applied to CSV & Excel exports (and PDF ledger when 12 or fewer columns are selected).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setSelectedColumns(BOOKING_CSV_COLUMN_DEFINITIONS.map((c) => c.key))
                }
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-nexa-bg-elevated text-nexa-text hover:text-nexa-mint border border-nexa-border-subtle"
              >
                All Columns
              </button>
              <button
                type="button"
                onClick={() => setSelectedColumns(ESSENTIAL_FINANCE_COLUMNS)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-nexa-bg-elevated text-nexa-text hover:text-nexa-mint border border-nexa-border-subtle"
              >
                Finance Preset
              </button>
              <button
                type="button"
                onClick={() => setSelectedColumns(OPERATIONS_COLUMNS)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-nexa-bg-elevated text-nexa-text hover:text-nexa-mint border border-nexa-border-subtle"
              >
                Operations Preset
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {BOOKING_CSV_COLUMN_DEFINITIONS.map((col) => {
              const checked = selectedColumns.includes(col.key)
              return (
                <label
                  key={col.key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                    checked
                      ? 'bg-nexa-mint/10 border-nexa-mint/30 text-nexa-text'
                      : 'bg-nexa-bg-deep/40 border-nexa-border-subtle text-nexa-text-secondary hover:text-nexa-text'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleColumn(col.key)}
                    className="accent-emerald-400 rounded"
                  />
                  <span className="truncate">{col.label}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-nexa-text-secondary mr-1">
              <Filter className="w-3.5 h-3.5 text-nexa-mint" />
              Range:
            </span>
            {(
              [
                { key: '7d', label: '7D' },
                { key: '30d', label: '30D' },
                { key: '90d', label: '90D' },
                { key: 'mtd', label: 'MTD' },
                { key: 'all', label: 'All Time' },
              ] as const
            ).map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => handlePresetSelect(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activePreset === p.key
                    ? 'bg-nexa-mint text-nexa-text-dark'
                    : 'bg-nexa-bg-elevated/60 text-nexa-text-secondary hover:text-nexa-text border border-nexa-border-subtle'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAnalytics}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-nexa-bg-elevated/60 border border-nexa-border-subtle text-nexa-text-secondary hover:text-nexa-mint transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-nexa-bg-elevated/60 border border-nexa-border-subtle text-nexa-text-secondary hover:text-nexa-text transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-nexa-text-secondary mb-1">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setActivePreset('all')
                setStartDate(e.target.value)
                setPage(1)
              }}
              className="nexa-input text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-nexa-text-secondary mb-1">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setActivePreset('all')
                setEndDate(e.target.value)
                setPage(1)
              }}
              className="nexa-input text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-nexa-text-secondary mb-1">
              Date Basis
            </label>
            <select
              value={dateField}
              onChange={(e) => {
                setDateField(e.target.value as ReportDateField)
                setPage(1)
              }}
              className="nexa-select text-xs"
            >
              <option value="bookingTime">Service Date & Time</option>
              <option value="createdOn">Booked / Created Date</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-nexa-text-secondary mb-1">
              Trend Granularity
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as ReportGroupBy)}
              className="nexa-select text-xs"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-nexa-text-secondary mb-1">
              Booking Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value)
                setPage(1)
              }}
              className="nexa-select text-xs"
            >
              <option value="">All Statuses</option>
              <option value={BookingStatus.BOOKED}>Booked</option>
              <option value={BookingStatus.ASSIGNED}>Assigned</option>
              <option value={BookingStatus.ACCEPTED}>Accepted</option>
              <option value={BookingStatus.IN_PROGRESS}>In Progress</option>
              <option value={BookingStatus.COMPLETED}>Completed</option>
              <option value={BookingStatus.CANCELLED}>Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-nexa-text-secondary mb-1">
              Payment Status
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => {
                setPaymentStatus(e.target.value)
                setPage(1)
              }}
              className="nexa-select text-xs"
            >
              <option value="">All Payments</option>
              <option value={PaymentStatus.CAPTURED}>Captured (Paid)</option>
              <option value={PaymentStatus.PENDING}>Pending</option>
              <option value={PaymentStatus.PROCESSING}>Processing</option>
              <option value={PaymentStatus.FAILED}>Failed</option>
              <option value={PaymentStatus.REFUNDED}>Refunded</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-nexa-text-secondary mb-1">
              Service Tier
            </label>
            <select
              value={serviceType}
              onChange={(e) => {
                setServiceType(e.target.value)
                setPage(1)
              }}
              className="nexa-select text-xs"
            >
              <option value="">All Service Tiers</option>
              <option value={ServiceType.BASIC}>Express Valet (Basic)</option>
              <option value={ServiceType.FULL}>Full Valet</option>
              <option value={ServiceType.PREMIUM}>Signature Detail (Premium)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-nexa-text-secondary mb-1">
              Detailer / Vendor
            </label>
            <select
              value={vendorId}
              onChange={(e) => {
                setVendorId(e.target.value)
                setPage(1)
              }}
              className="nexa-select text-xs"
            >
              <option value="">All Detailers</option>
              {vendorOptions.map((v) => (
                <option key={v.vendorId} value={v.vendorId}>
                  {v.companyName ? `${v.companyName} (${v.vendorName})` : v.vendorName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-nexa-text-secondary mb-1">
              Postcode Prefix
            </label>
            <input
              type="text"
              placeholder="e.g. AB10"
              value={postcode}
              onChange={(e) => {
                setPostcode(e.target.value)
                setPage(1)
              }}
              className="nexa-input text-xs uppercase"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-nexa-text-secondary mb-1">
              Search Bookings
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-nexa-text-secondary absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Ref, customer, reg, street..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="nexa-input text-xs pl-8"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ERROR / LOADING STATES */}
      {error && (
        <div className="glass-card p-6 border border-nexa-error/30 bg-nexa-error/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-nexa-error shrink-0" />
            <div>
              <h3 className="font-semibold text-sm text-nexa-error">Failed to load analytics</h3>
              <p className="text-xs text-nexa-text-secondary">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadAnalytics}
            className="px-4 py-2 rounded-xl bg-nexa-mint/15 border border-nexa-mint/30 text-nexa-mint text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="flex flex-col items-center justify-center min-h-[45vh] space-y-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-nexa-mint/30 border-t-nexa-mint" />
          <span className="text-xs text-nexa-text-secondary">
            Crunching booking, revenue & vendor metrics…
          </span>
        </div>
      ) : (
        data &&
        kpis && (
          <>
            {/* EXECUTIVE KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="glass-card p-5 glow-teal flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-nexa-text-secondary">
                    Net Revenue
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-nexa-mint/15 flex items-center justify-center text-nexa-mint">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="font-display font-extrabold text-3xl text-nexa-text">
                    {formatGbp(kpis.netRevenue)}
                  </div>
                  <p className="text-[11px] text-nexa-text-secondary mt-1">
                    Gross {formatGbp(kpis.grossRevenue)} · Fees {formatGbp(kpis.platformFees)} · Payouts{' '}
                    {formatGbp(kpis.vendorPayouts)}
                  </p>
                </div>
              </div>

              <div className="glass-card p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-nexa-text-secondary">
                    Total Bookings
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="font-display font-extrabold text-3xl text-nexa-text">
                    {kpis.totalBookings}
                  </div>
                  <p className="text-[11px] text-nexa-text-secondary mt-1">
                    {kpis.confirmedPaidBookings} paid · {kpis.unpaidBookings} unpaid ·{' '}
                    {kpis.cancelledBookings} cancelled
                  </p>
                </div>
              </div>

              <div className="glass-card p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-nexa-text-secondary">
                    Avg Order Value
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="font-display font-extrabold text-3xl text-nexa-text">
                    {formatGbp(kpis.averageOrderValue)}
                  </div>
                  <p className="text-[11px] text-nexa-text-secondary mt-1">
                    Discounts given: {formatGbp(kpis.totalDiscounts)} · Refunded:{' '}
                    {formatGbp(kpis.refundedAmount)} ({kpis.refundedBookings})
                  </p>
                </div>
              </div>

              <div className="glass-card p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-nexa-text-secondary">
                    Completion & Cancellation
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="font-display font-extrabold text-3xl text-nexa-text">
                    {kpis.completionRate.toFixed(1)}%
                  </div>
                  <p className="text-[11px] text-nexa-text-secondary mt-1">
                    {kpis.completedBookings} completed · {kpis.cancellationRate.toFixed(1)}% cancelled
                  </p>
                </div>
              </div>

              <div className="glass-card p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-nexa-text-secondary">
                    Customer Retention & CSAT
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                    <Star className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="font-display font-extrabold text-3xl text-nexa-text">
                    {kpis.averageRating !== null ? `${kpis.averageRating.toFixed(2)} ★` : '—'}
                  </div>
                  <p className="text-[11px] text-nexa-text-secondary mt-1">
                    {kpis.totalReviews} review(s) · {data.customers.repeatCustomers} repeat /{' '}
                    {data.customers.newCustomers} new customers
                  </p>
                </div>
              </div>

              <div className="glass-card p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-nexa-text-secondary">
                    Corporate Fleet Leads
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 flex items-center justify-center text-cyan-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="font-display font-extrabold text-3xl text-nexa-text">
                    {data.corporate.totalEnquiries}
                  </div>
                  <p className="text-[11px] text-nexa-text-secondary mt-1">
                    {data.corporate.newEnquiries} new · {data.corporate.invoicedEnquiries} invoiced ·{' '}
                    {data.corporate.totalFleetVehiclesRequested} fleet vehicles
                  </p>
                </div>
              </div>
            </div>

            {/* CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* REVENUE & BOOKING TREND */}
              <div className="glass-card p-6 lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display font-bold text-lg text-nexa-text">
                      Revenue & Volume Trend
                    </h2>
                    <p className="text-xs text-nexa-text-secondary">
                      Confirmed paid revenue (£) and booking count grouped by {groupBy}
                    </p>
                  </div>
                </div>

                {data.timeseries.length === 0 ? (
                  <div className="h-72 flex items-center justify-center text-xs text-nexa-text-secondary">
                    No bookings matched the selected filters.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.timeseries} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="nexaRevenueFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#66ffd1" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#66ffd1" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="nexaFeeFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                        <XAxis
                          dataKey="label"
                          stroke="#94a3b8"
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                        />
                        <YAxis
                          yAxisId="left"
                          stroke="#94a3b8"
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          tickFormatter={(v) => `£${v}`}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="#94a3b8"
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#112236',
                            border: '1px solid rgba(102,255,209,0.25)',
                            borderRadius: '12px',
                            color: '#f1f5f9',
                            fontSize: '12px',
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="revenue"
                          name="Revenue (£)"
                          stroke="#66ffd1"
                          strokeWidth={2}
                          fill="url(#nexaRevenueFill)"
                        />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="platformFees"
                          name="Platform Fee (£)"
                          stroke="#38bdf8"
                          strokeWidth={1.5}
                          fill="url(#nexaFeeFill)"
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="bookingsCount"
                          name="Bookings"
                          fill="#a78bfa"
                          radius={[4, 4, 0, 0]}
                          barSize={14}
                          opacity={0.75}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* SERVICE TIER REVENUE PIE */}
              <div className="glass-card p-6 space-y-4">
                <div>
                  <h2 className="font-display font-bold text-lg text-nexa-text">
                    Service Tier Mix
                  </h2>
                  <p className="text-xs text-nexa-text-secondary">
                    Share of bookings & revenue by valet package
                  </p>
                </div>

                {data.byServiceType.length === 0 ? (
                  <div className="h-72 flex items-center justify-center text-xs text-nexa-text-secondary">
                    No service tier data in this range.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.byServiceType}
                            dataKey="count"
                            nameKey="label"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={76}
                            paddingAngle={3}
                          >
                            {data.byServiceType.map((entry, idx) => (
                              <Cell
                                key={entry.key}
                                fill={CHART_COLORS[idx % CHART_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#112236',
                              border: '1px solid rgba(102,255,209,0.25)',
                              borderRadius: '12px',
                              color: '#f1f5f9',
                              fontSize: '12px',
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {data.byServiceType.map((item, idx) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-nexa-bg-deep/40"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                            />
                            <span className="truncate text-nexa-text font-medium">{item.label}</span>
                          </div>
                          <div className="shrink-0 text-right font-mono text-nexa-text-secondary">
                            <span className="text-nexa-text font-semibold">{item.count}</span> (
                            {item.percentage.toFixed(0)}%) · {formatGbp(item.revenue)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DEEP-DIVE TABS */}
            <div className="glass-card overflow-hidden">
              <div className="px-6 pt-4 border-b border-nexa-border-subtle flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      {
                        key: 'bookings',
                        label: `Booking Records (${bookingsPage?.total ?? 0})`,
                        icon: Calendar,
                      },
                      {
                        key: 'vendors',
                        label: `Vendor Leaderboard (${data.vendorPerformance.length})`,
                        icon: Store,
                      },
                      {
                        key: 'addons_geo',
                        label: 'Add-ons & Postcodes',
                        icon: MapPin,
                      },
                      {
                        key: 'mix',
                        label: 'Status & Vehicle Mix',
                        icon: Percent,
                      },
                    ] as const
                  ).map((tab) => {
                    const Icon = tab.icon
                    const active = activeTab === tab.key
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
                          active
                            ? 'border-nexa-mint text-nexa-mint'
                            : 'border-transparent text-nexa-text-secondary hover:text-nexa-text'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="p-6">
                {/* TAB 1: BOOKING RECORDS (CSV PREVIEW) */}
                {activeTab === 'bookings' && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <p className="text-xs text-nexa-text-secondary">
                        Live preview of the filtered dataset. Exporting to{' '}
                        <strong className="text-nexa-text">CSV</strong>,{' '}
                        <strong className="text-nexa-text">Excel</strong>, or{' '}
                        <strong className="text-nexa-text">PDF</strong> includes all{' '}
                        <strong className="text-nexa-mint">{bookingsPage?.total ?? 0}</strong> matching
                        record(s) with your active filters.
                      </p>
                      {tableLoading && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-nexa-mint">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Updating page…
                        </span>
                      )}
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-nexa-border-subtle">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-nexa-bg-deep/70 text-nexa-text-secondary uppercase tracking-wider text-[10px]">
                            <th className="py-3 px-3 font-bold">Ref</th>
                            <th className="py-3 px-3 font-bold">Service Date</th>
                            <th className="py-3 px-3 font-bold">Customer</th>
                            <th className="py-3 px-3 font-bold">Vehicle</th>
                            <th className="py-3 px-3 font-bold">Tier</th>
                            <th className="py-3 px-3 font-bold">Postcode</th>
                            <th className="py-3 px-3 font-bold">Detailer</th>
                            <th className="py-3 px-3 font-bold">Status</th>
                            <th className="py-3 px-3 font-bold">Payment</th>
                            <th className="py-3 px-3 font-bold text-right">Price</th>
                            <th className="py-3 px-3 font-bold text-right">Fee</th>
                            <th className="py-3 px-3 font-bold text-right">Payout</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-nexa-border-subtle/50">
                          {bookingsPage && bookingsPage.items.length > 0 ? (
                            bookingsPage.items.map((row) => (
                              <tr
                                key={row.bookingId}
                                className="hover:bg-nexa-bg-elevated/30 transition-colors"
                              >
                                <td className="py-3 px-3 font-mono text-[11px] text-nexa-mint whitespace-nowrap">
                                  {row.bookingReference.slice(0, 12)}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap text-nexa-text">
                                  {new Date(row.bookingTime).toLocaleString('en-GB', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short',
                                  })}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-nexa-text truncate max-w-[150px]">
                                    {row.customerName}
                                  </div>
                                  {row.customerEmail && (
                                    <div className="text-[10px] text-nexa-text-secondary truncate max-w-[150px]">
                                      {row.customerEmail}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-3">
                                  <div className="text-nexa-text truncate max-w-[160px]">
                                    {row.vehicleSummary}
                                  </div>
                                  <div className="text-[10px] text-nexa-text-secondary capitalize">
                                    {row.vehicleType}
                                  </div>
                                </td>
                                <td className="py-3 px-3 capitalize text-nexa-text">
                                  {row.serviceType}
                                  {row.addonsCount > 0 && (
                                    <span className="block text-[10px] text-nexa-text-secondary">
                                      +{row.addonsCount} add-on{row.addonsCount > 1 ? 's' : ''}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3 font-mono text-[11px] text-nexa-text-secondary whitespace-nowrap">
                                  {row.postcode || '—'}
                                </td>
                                <td className="py-3 px-3 text-nexa-text truncate max-w-[140px]">
                                  {row.vendorCompany || row.vendorName}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                      STATUS_BADGE[row.status] ??
                                      'bg-nexa-bg-elevated text-nexa-text-secondary border-nexa-border-subtle'
                                    }`}
                                  >
                                    {row.status.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                      PAYMENT_BADGE[row.paymentStatus] ??
                                      'bg-nexa-bg-elevated text-nexa-text-secondary border-nexa-border-subtle'
                                    }`}
                                  >
                                    {row.paymentStatus}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-semibold text-nexa-text whitespace-nowrap">
                                  {formatGbp(row.finalPrice)}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-nexa-text-secondary whitespace-nowrap">
                                  {formatGbp(row.platformFee)}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-nexa-text-secondary whitespace-nowrap">
                                  {formatGbp(row.vendorPayout)}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td
                                colSpan={12}
                                className="py-12 text-center text-nexa-text-secondary"
                              >
                                No bookings match the current filters.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* PAGINATION */}
                    {bookingsPage && bookingsPage.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-nexa-text-secondary">
                          Page {page} of {bookingsPage.totalPages} ({bookingsPage.total} total)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={page <= 1 || tableLoading}
                            onClick={() => handlePageChange(page - 1)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-nexa-border-subtle bg-nexa-bg-elevated/60 text-xs font-semibold text-nexa-text disabled:opacity-40"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Prev
                          </button>
                          <button
                            type="button"
                            disabled={page >= bookingsPage.totalPages || tableLoading}
                            onClick={() => handlePageChange(page + 1)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-nexa-border-subtle bg-nexa-bg-elevated/60 text-xs font-semibold text-nexa-text disabled:opacity-40"
                          >
                            Next
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: VENDOR LEADERBOARD */}
                {activeTab === 'vendors' && (
                  <div className="overflow-x-auto rounded-xl border border-nexa-border-subtle">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-nexa-bg-deep/70 text-nexa-text-secondary uppercase tracking-wider text-[10px]">
                          <th className="py-3 px-4 font-bold">Vendor / Detailer</th>
                          <th className="py-3 px-4 font-bold">Approval</th>
                          <th className="py-3 px-4 font-bold text-right">Assigned</th>
                          <th className="py-3 px-4 font-bold text-right">Completed</th>
                          <th className="py-3 px-4 font-bold text-right">Cancelled</th>
                          <th className="py-3 px-4 font-bold text-right">Completion %</th>
                          <th className="py-3 px-4 font-bold text-right">Revenue</th>
                          <th className="py-3 px-4 font-bold text-right">Payout</th>
                          <th className="py-3 px-4 font-bold text-right">Platform Fee</th>
                          <th className="py-3 px-4 font-bold text-right">Rating</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-nexa-border-subtle/50">
                        {data.vendorPerformance.length > 0 ? (
                          data.vendorPerformance.map((v) => (
                            <tr
                              key={v.vendorId}
                              className="hover:bg-nexa-bg-elevated/30 transition-colors"
                            >
                              <td className="py-3 px-4">
                                <div className="font-semibold text-nexa-text">
                                  {v.companyName || v.vendorName}
                                </div>
                                {v.companyName && (
                                  <div className="text-[10px] text-nexa-text-secondary">
                                    {v.vendorName}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                    v.approvalStatus === 'ACTIVE'
                                      ? 'bg-nexa-mint/15 text-nexa-mint border-nexa-mint/30'
                                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  }`}
                                >
                                  {v.approvalStatus}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono">{v.assignedBookings}</td>
                              <td className="py-3 px-4 text-right font-mono text-nexa-mint">
                                {v.completedBookings}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-rose-300">
                                {v.cancelledBookings}
                              </td>
                              <td className="py-3 px-4 text-right font-mono">
                                {v.completionRate.toFixed(1)}%
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-semibold text-nexa-text">
                                {formatGbp(v.totalRevenue)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-nexa-text-secondary">
                                {formatGbp(v.vendorPayout)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-nexa-text-secondary">
                                {formatGbp(v.platformFee)}
                              </td>
                              <td className="py-3 px-4 text-right font-mono">
                                {v.averageRating !== null
                                  ? `${v.averageRating.toFixed(1)} ★ (${v.reviewCount})`
                                  : '—'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan={10}
                              className="py-12 text-center text-nexa-text-secondary"
                            >
                              No vendor performance data found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* TAB 3: ADD-ONS & POSTCODES */}
                {activeTab === 'addons_geo' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="font-display font-bold text-sm text-nexa-text flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-nexa-mint" />
                        Top Valet Add-ons
                      </h3>
                      {data.topAddons.length === 0 ? (
                        <p className="text-xs text-nexa-text-secondary py-8 text-center">
                          No add-ons booked in the selected range.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {data.topAddons.slice(0, 10).map((addon) => (
                            <div
                              key={addon.addonId || addon.name}
                              className="p-3 rounded-xl bg-nexa-bg-deep/40 border border-nexa-border-subtle flex items-center justify-between"
                            >
                              <div>
                                <div className="text-xs font-semibold text-nexa-text">
                                  {addon.name}
                                </div>
                                <div className="text-[11px] text-nexa-text-secondary">
                                  Booked {addon.timesBooked} time(s)
                                </div>
                              </div>
                              <div className="font-mono text-xs font-bold text-nexa-mint">
                                {formatGbp(addon.totalRevenue)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="font-display font-bold text-sm text-nexa-text flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-400" />
                        Demand by Postcode Area
                      </h3>
                      {data.topPostcodes.length === 0 ? (
                        <p className="text-xs text-nexa-text-secondary py-8 text-center">
                          No postcode data in the selected range.
                        </p>
                      ) : (
                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.topPostcodes}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                              <XAxis
                                dataKey="postcodeArea"
                                stroke="#94a3b8"
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                              />
                              <YAxis
                                stroke="#94a3b8"
                                tick={{ fill: '#94a3b8', fontSize: 11 }}
                                allowDecimals={false}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: '#112236',
                                  border: '1px solid rgba(56,189,248,0.3)',
                                  borderRadius: '12px',
                                  color: '#f1f5f9',
                                  fontSize: '12px',
                                }}
                              />
                              <Bar
                                dataKey="bookingsCount"
                                name="Bookings"
                                fill="#38bdf8"
                                radius={[6, 6, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 4: STATUS, PAYMENT & VEHICLE MIX */}
                {activeTab === 'mix' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <BreakdownCard
                      title="Booking Statuses"
                      icon={<Calendar className="w-4 h-4 text-nexa-mint" />}
                      items={data.byStatus}
                    />
                    <BreakdownCard
                      title="Payment Statuses"
                      icon={<Users className="w-4 h-4 text-blue-400" />}
                      items={data.byPaymentStatus}
                    />
                    <BreakdownCard
                      title="Vehicle Categories"
                      icon={<BarChart3 className="w-4 h-4 text-purple-400" />}
                      items={data.byVehicleCategory}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )
      )}
    </motion.div>
  )
}

function BreakdownCard({
  title,
  icon,
  items,
}: {
  title: string
  icon: React.ReactNode
  items: ReportingAnalyticsResponse['byStatus']
}) {
  return (
    <div className="p-4 rounded-xl bg-nexa-bg-deep/40 border border-nexa-border-subtle space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-display font-bold text-sm text-nexa-text">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-nexa-text-secondary py-6 text-center">No data available.</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <div key={item.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-nexa-text font-medium">{item.label}</span>
                <span className="font-mono text-nexa-text-secondary">
                  {item.count} ({item.percentage.toFixed(1)}%) · {formatGbp(item.revenue)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-nexa-bg-elevated overflow-hidden">
                <div
                  className="h-full rounded-full bg-nexa-mint transition-all duration-300"
                  style={{ width: `${Math.min(100, item.percentage)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
