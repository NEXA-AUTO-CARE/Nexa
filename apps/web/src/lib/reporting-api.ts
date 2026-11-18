import {
  BOOKING_CSV_COLUMN_DEFINITIONS,
  type BookingCsvColumnKey,
  type ReportingAnalyticsResponse,
  type ReportingQueryParams,
} from '@nexa/shared'
import { api } from './api-client'

export { BOOKING_CSV_COLUMN_DEFINITIONS }
export type { BookingCsvColumnKey }

const EXCEL_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function cleanQueryParams(params: ReportingQueryParams): Record<string, string | number> {
  const cleaned: Record<string, string | number> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value as string | number
    }
  }
  return cleaned
}

function extractFilenameFromHeader(
  headerValue: string | undefined,
  fallback: string,
): string {
  if (!headerValue) return fallback
  const match = /filename\*?=(?:UTF-8'')?"?([^";\n]+)"?/i.exec(headerValue)
  return match?.[1] ? decodeURIComponent(match[1]) : fallback
}

function triggerBrowserDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

async function downloadBinaryReport(
  endpoint: string,
  params: ReportingQueryParams,
  mimeType: string,
  fallbackFilename: string,
): Promise<{ filename: string; rowCount: number }> {
  const response = await api.get<Blob>(endpoint, {
    params: cleanQueryParams(params),
    responseType: 'blob',
  })

  const filename = extractFilenameFromHeader(
    response.headers['content-disposition'] as string | undefined,
    fallbackFilename,
  )
  const rawCount = response.headers['x-report-row-count'] as string | undefined
  const rowCount = rawCount ? parseInt(rawCount, 10) || 0 : 0

  triggerBrowserDownload(new Blob([response.data], { type: mimeType }), filename)
  return { filename, rowCount }
}

export async function fetchReportingAnalytics(
  params: ReportingQueryParams,
): Promise<ReportingAnalyticsResponse> {
  const { data } = await api.get<ReportingAnalyticsResponse>(
    '/admin/reporting/analytics',
    { params: cleanQueryParams(params) },
  )
  return data
}

export async function fetchReportingBookings(
  params: ReportingQueryParams,
): Promise<ReportingAnalyticsResponse['bookings']> {
  const { data } = await api.get<ReportingAnalyticsResponse['bookings']>(
    '/admin/reporting/bookings',
    { params: cleanQueryParams(params) },
  )
  return data
}

export function downloadBookingsCsv(
  params: ReportingQueryParams,
): Promise<{ filename: string; rowCount: number }> {
  const dateStamp = new Date().toISOString().slice(0, 10)
  return downloadBinaryReport(
    '/admin/reporting/bookings/export',
    params,
    'text/csv;charset=utf-8;',
    `nexa-bookings-report-${dateStamp}.csv`,
  )
}

export function downloadBookingsExcel(
  params: ReportingQueryParams,
): Promise<{ filename: string; rowCount: number }> {
  const dateStamp = new Date().toISOString().slice(0, 10)
  return downloadBinaryReport(
    '/admin/reporting/bookings/export/excel',
    params,
    EXCEL_MIME,
    `nexa-bookings-report-${dateStamp}.xlsx`,
  )
}

export function downloadBookingsPdf(
  params: ReportingQueryParams,
): Promise<{ filename: string; rowCount: number }> {
  const dateStamp = new Date().toISOString().slice(0, 10)
  return downloadBinaryReport(
    '/admin/reporting/bookings/export/pdf',
    params,
    'application/pdf',
    `nexa-bookings-report-${dateStamp}.pdf`,
  )
}

export function downloadVendorsCsv(
  params: ReportingQueryParams,
): Promise<{ filename: string; rowCount: number }> {
  const dateStamp = new Date().toISOString().slice(0, 10)
  return downloadBinaryReport(
    '/admin/reporting/vendors/export',
    params,
    'text/csv;charset=utf-8;',
    `nexa-vendor-performance-${dateStamp}.csv`,
  )
}

export function downloadVendorsExcel(
  params: ReportingQueryParams,
): Promise<{ filename: string; rowCount: number }> {
  const dateStamp = new Date().toISOString().slice(0, 10)
  return downloadBinaryReport(
    '/admin/reporting/vendors/export/excel',
    params,
    EXCEL_MIME,
    `nexa-vendor-performance-${dateStamp}.xlsx`,
  )
}
