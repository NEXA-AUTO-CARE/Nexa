import type { BookingStatus } from '../../enums/booking-status.enum.js';
import type { PaymentStatus } from '../../enums/payment-status.enum.js';
import type { ServiceType } from '../../enums/service-type.enum.js';

export type ReportGroupBy = 'day' | 'week' | 'month';
export type ReportDateField = 'bookingTime' | 'createdOn';

export const BOOKING_CSV_COLUMN_DEFINITIONS = [
  { key: 'bookingReference', label: 'Booking Reference' },
  { key: 'bookingId', label: 'Booking ID' },
  { key: 'createdAt', label: 'Booked On (UTC)' },
  { key: 'bookingTime', label: 'Service Date & Time (UTC)' },
  { key: 'status', label: 'Booking Status' },
  { key: 'paymentStatus', label: 'Payment Status' },
  { key: 'serviceType', label: 'Service Tier' },
  { key: 'vehicleType', label: 'Vehicle Category' },
  { key: 'vehicleSummary', label: 'Vehicle' },
  { key: 'registrationNumber', label: 'Registration' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'customerEmail', label: 'Customer Email' },
  { key: 'customerPhone', label: 'Customer Phone' },
  { key: 'vendorName', label: 'Detailer / Vendor' },
  { key: 'vendorCompany', label: 'Vendor Company' },
  { key: 'serviceAddress', label: 'Service Address' },
  { key: 'postcode', label: 'Postcode' },
  { key: 'postTown', label: 'Post Town' },
  { key: 'addons', label: 'Add-ons' },
  { key: 'addonsCount', label: 'Add-ons Count' },
  { key: 'addonsTotal', label: 'Add-ons Total (£)' },
  { key: 'originalPrice', label: 'Original Price (£)' },
  { key: 'discountAmount', label: 'Discount (£)' },
  { key: 'promotionTitle', label: 'Promotion' },
  { key: 'finalPrice', label: 'Final Price (£)' },
  { key: 'platformFee', label: 'Platform Fee (£)' },
  { key: 'vendorPayout', label: 'Vendor Payout (£)' },
  { key: 'stripePaymentIntentId', label: 'Stripe Payment Intent' },
  { key: 'transactionReference', label: 'Transaction Reference' },
  { key: 'rating', label: 'Customer Rating' },
] as const;

export type BookingCsvColumnKey =
  (typeof BOOKING_CSV_COLUMN_DEFINITIONS)[number]['key'];

export interface ReportingQueryParams {
  startDate?: string;
  endDate?: string;
  groupBy?: ReportGroupBy;
  dateField?: ReportDateField;
  status?: BookingStatus;
  paymentStatus?: PaymentStatus;
  serviceType?: ServiceType;
  vendorId?: string;
  postcode?: string;
  search?: string;
  page?: number;
  limit?: number;
  columns?: string;
}

export interface ReportingKpiSummary {
  totalBookings: number;
  confirmedPaidBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  unpaidBookings: number;
  refundedBookings: number;
  grossRevenue: number;
  netRevenue: number;
  totalDiscounts: number;
  refundedAmount: number;
  platformFees: number;
  vendorPayouts: number;
  averageOrderValue: number;
  completionRate: number;
  cancellationRate: number;
  averageRating: number | null;
  totalReviews: number;
}

export interface RevenueTimeseriesPoint {
  period: string;
  label: string;
  bookingsCount: number;
  paidCount: number;
  cancelledCount: number;
  revenue: number;
  platformFees: number;
  vendorPayouts: number;
}

export interface BreakdownItem {
  key: string;
  label: string;
  count: number;
  revenue: number;
  percentage: number;
}

export interface VendorPerformanceRow {
  vendorId: string;
  vendorName: string;
  companyName: string | null;
  approvalStatus: string;
  assignedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  completionRate: number;
  totalRevenue: number;
  vendorPayout: number;
  platformFee: number;
  averageRating: number | null;
  reviewCount: number;
}

export interface AddonAnalyticsRow {
  addonId: string;
  name: string;
  timesBooked: number;
  totalRevenue: number;
}

export interface PostcodeAnalyticsRow {
  postcodeArea: string;
  bookingsCount: number;
  revenue: number;
}

export interface CorporateSummary {
  totalEnquiries: number;
  newEnquiries: number;
  invoicedEnquiries: number;
  totalFleetVehiclesRequested: number;
}

export interface CustomerSummary {
  totalCustomersInPeriod: number;
  repeatCustomers: number;
  newCustomers: number;
}

export interface BookingReportRow {
  bookingId: string;
  bookingReference: string;
  createdAt: string;
  bookingTime: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  serviceType: ServiceType;
  vehicleType: string;
  vehicleSummary: string;
  registrationNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  vendorId: string | null;
  vendorName: string;
  vendorCompany: string;
  serviceAddress: string;
  postcode: string;
  postTown: string;
  addons: string;
  addonsCount: number;
  addonsTotal: string;
  originalPrice: string;
  discountAmount: string;
  promotionTitle: string;
  finalPrice: string;
  platformFee: string;
  vendorPayout: string;
  stripePaymentIntentId: string;
  transactionReference: string;
  rating: number | null;
}

export interface ReportingAnalyticsResponse {
  filters: {
    startDate: string | null;
    endDate: string | null;
    groupBy: ReportGroupBy;
    dateField: ReportDateField;
    status: BookingStatus | null;
    paymentStatus: PaymentStatus | null;
    serviceType: ServiceType | null;
    vendorId: string | null;
    postcode: string | null;
    search: string | null;
  };
  kpis: ReportingKpiSummary;
  timeseries: RevenueTimeseriesPoint[];
  byStatus: BreakdownItem[];
  byPaymentStatus: BreakdownItem[];
  byServiceType: BreakdownItem[];
  byVehicleCategory: BreakdownItem[];
  topAddons: AddonAnalyticsRow[];
  topPostcodes: PostcodeAnalyticsRow[];
  vendorPerformance: VendorPerformanceRow[];
  corporate: CorporateSummary;
  customers: CustomerSummary;
  bookings: {
    items: BookingReportRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
