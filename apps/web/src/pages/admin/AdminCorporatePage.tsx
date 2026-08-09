import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api-client'
import {
  Building2,
  Mail,
  Phone,
  User,
  CheckCircle,
  FileText,
  Printer,
  X,
  AlertTriangle,
  Trash2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSettings } from '../../contexts/SettingsContext'

interface CorporateLead {
  enquiryId: string
  companyName: string
  contactPerson: string
  businessEmail: string
  businessPhone: string
  fleetSize: number
  status: 'new' | 'invoiced'
  createdOn: string
}

export default function AdminCorporatePage() {
  const [leads, setLeads] = useState<CorporateLead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Invoice state
  const [selectedLead, setSelectedLead] = useState<CorporateLead | null>(null)
  const [selectedCategoryRate, setSelectedCategoryRate] = useState(25) // Standard default
  const [discountPercent, setDiscountPercent] = useState(10) // 10% default corp discount
  const [notes, setNotes] = useState('Standard Nexa Corporate Fleet Wash agreement.')
  const [raisedSuccess, setRaisedSuccess] = useState(false)

  const { bookingFee, vehicleCategories, labelFor, priceFor } = useSettings()

  const defaultPrice = Number(priceFor('small_car')) || 40

  // Sync category rate when default price changes
  useEffect(() => {
    Promise.resolve().then(() => setSelectedCategoryRate(defaultPrice))
  }, [defaultPrice])

  const loadLeads = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<CorporateLead[]>('/corporate-fleet')
      setLeads(data)
    } catch (err) {
      console.error(err)
      setError('Failed to fetch corporate fleet enquiries. Make sure you are logged in as admin.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState is deferred behind await
    loadLeads()
  }, [])

  const handleMarkInvoiced = async (leadId: string) => {
    try {
      await api.patch(`/corporate-fleet/${leadId}/invoiced`)
      setLeads(leads.map(l => l.enquiryId === leadId ? { ...l, status: 'invoiced' } : l))
      setRaisedSuccess(true)
      setTimeout(() => {
        setRaisedSuccess(false)
        setSelectedLead(null)
      }, 2000)
    } catch (err) {
      console.error(err)
      alert('Failed to update enquiry status. Please try again.')
    }
  }

  const handleDeleteLead = async (leadId: string, companyName: string) => {
    if (!window.confirm(`Are you sure you want to delete the enquiry for ${companyName}?`)) return
    try {
      await api.delete(`/corporate-fleet/${leadId}`)
      setLeads(leads.filter(l => l.enquiryId !== leadId))
    } catch (err) {
      console.error(err)
      alert('Failed to delete enquiry.')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  // Cost calculations
  const rawSubtotal = selectedLead ? selectedCategoryRate * selectedLead.fleetSize : 0
  const discountAmount = (rawSubtotal * discountPercent) / 100
  const bookingFees = selectedLead ? parseFloat(bookingFee) * selectedLead.fleetSize : 0
  const totalDue = rawSubtotal - discountAmount + bookingFees

  // Compute dates once when an invoice is opened (avoids impure Date.now in render)
  const { invoiceDate, dueDate } = useMemo(() => {
    const now = new Date()
    const due = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    return {
      invoiceDate: now.toLocaleDateString(),
      dueDate: due.toLocaleDateString(),
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally recompute only when lead changes
  }, [selectedLead])

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-nexa-text tracking-tight">
            Corporate Fleet Pipeline
          </h1>
          <p className="text-nexa-text-secondary text-sm">
            Manage company wash inquiries and generate printable invoices.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-nexa-mint/30 border-t-nexa-mint" />
          <span className="text-nexa-text-secondary text-sm">Retrieving fleet pipeline…</span>
        </div>
      ) : error ? (
        <div className="glass-card p-6 border border-nexa-error/25 bg-nexa-error/5 max-w-xl mx-auto text-center">
          <AlertTriangle className="w-12 h-12 text-nexa-error mx-auto mb-4" />
          <h3 className="font-semibold text-nexa-error mb-2">Access Error</h3>
          <p className="text-xs text-nexa-text-secondary">{error}</p>
        </div>
      ) : leads.length === 0 ? (
        <div className="glass-card p-12 text-center text-nexa-text-secondary">
          <Building2 className="w-12 h-12 mx-auto text-nexa-text-muted mb-4" />
          <h3 className="font-display font-bold text-lg mb-1">No Leads Registered</h3>
          <p className="text-sm">No corporate fleet inquiries are currently pending.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-4 border border-nexa-border-subtle flex items-center justify-between">
              <div>
                <p className="text-xs text-nexa-text-secondary uppercase tracking-wider mb-1">Total Leads</p>
                <p className="text-2xl font-bold text-nexa-text">{leads.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-nexa-text-muted opacity-50" />
            </div>
            <div className="glass-card p-4 border border-nexa-border-subtle flex items-center justify-between">
              <div>
                <p className="text-xs text-nexa-text-secondary uppercase tracking-wider mb-1">Active (Pending)</p>
                <p className="text-2xl font-bold text-amber-400">{leads.filter((l) => l.status === 'new').length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-400 opacity-50" />
            </div>
            <div className="glass-card p-4 border border-nexa-border-subtle flex items-center justify-between">
              <div>
                <p className="text-xs text-nexa-text-secondary uppercase tracking-wider mb-1">Invoiced</p>
                <p className="text-2xl font-bold text-nexa-mint">{leads.filter((l) => l.status === 'invoiced').length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-nexa-mint opacity-50" />
            </div>
          </div>

          {/* FILTER BAR */}
          <div className="flex justify-end">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-nexa-bg border border-nexa-border-subtle text-nexa-text rounded-xl px-4 py-2 text-sm focus:ring-0 focus:border-nexa-mint/40"
            >
              <option value="all">All Leads</option>
              <option value="new">Pending Invoice</option>
              <option value="invoiced">Invoiced</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {leads
              .filter((l) => (statusFilter === 'all' ? true : l.status === statusFilter))
              .map((lead) => (
            <motion.div
              layout
              key={lead.enquiryId}
              className="glass-card p-6 border border-nexa-border-subtle hover:border-nexa-mint/20 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-4 flex-1">
                {/* Brand & status */}
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="font-display font-bold text-lg text-nexa-text">
                    {lead.companyName}
                  </h3>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-semibold capitalize ${
                      lead.status === 'invoiced'
                        ? 'bg-nexa-mint/10 text-nexa-mint border border-nexa-mint/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {lead.status === 'invoiced' ? 'Invoiced' : 'Pending Invoice'}
                  </span>
                </div>

                {/* Info grids */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-2 gap-x-6 text-xs">
                  <div className="flex items-center gap-2 text-nexa-text-secondary">
                    <User className="w-4 h-4 text-nexa-mint" />
                    <span>Contact: {lead.contactPerson}</span>
                  </div>
                  <div className="flex items-center gap-2 text-nexa-text-secondary">
                    <Mail className="w-4 h-4 text-nexa-mint" />
                    <span>Email: {lead.businessEmail}</span>
                  </div>
                  <div className="flex items-center gap-2 text-nexa-text-secondary">
                    <Phone className="w-4 h-4 text-nexa-mint" />
                    <span>Phone: {lead.businessPhone}</span>
                  </div>
                </div>

                <div className="text-xs font-semibold text-nexa-mint/90">
                  <span>Requested Fleet Size: </span>
                  <strong className="text-sm font-extrabold text-nexa-text">{lead.fleetSize} vehicles</strong>
                </div>
              </div>

              {/* Actions */}
              <div className="shrink-0 flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedLead(lead)
                    setRaisedSuccess(false)
                  }}
                  className={`flex items-center gap-2 py-2.5 px-5 rounded-xl text-xs font-bold transition-all duration-300 ${
                    lead.status === 'invoiced'
                      ? 'border border-nexa-border-subtle bg-nexa-bg hover:bg-nexa-bg-elevated text-nexa-text'
                      : 'bg-nexa-mint text-nexa-bg hover:shadow-[0_0_15px_rgba(160,255,200,0.2)] hover:bg-nexa-mint/90'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>{lead.status === 'invoiced' ? 'View Invoice' : 'Generate Invoice'}</span>
                </button>
                <button
                  onClick={() => handleDeleteLead(lead.enquiryId, lead.companyName)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-xl transition-colors"
                  title="Delete Lead"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
            ))}
            {leads.filter((l) => (statusFilter === 'all' ? true : l.status === statusFilter)).length === 0 && (
              <div className="text-center py-8 text-nexa-text-secondary text-sm">
                No corporate leads match the selected filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRINT-OPTIMIZED INVOICE GENERATOR MODAL */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm print:p-0 print:bg-white print:fixed print:inset-0">
            <style>{`
              @media print {
                body * {
                  visibility: hidden;
                }
                #printable-invoice-container, #printable-invoice-container * {
                  visibility: visible;
                }
                #printable-invoice-container {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100%;
                  margin: 0;
                  padding: 0;
                }
              }
            `}</style>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-nexa-bg border border-nexa-border-subtle w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row print:border-none print:shadow-none print:w-full print:bg-white"
            >
              {/* MODAL LEFT SIDE: INTERACTIVE INVOICE EDITOR (Hidden when printing) */}
              <div className="p-6 md:w-80 border-r border-nexa-border-subtle bg-nexa-bg-deep space-y-6 print:hidden shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-base text-nexa-text">Invoice Options</h3>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="p-1 text-nexa-text-secondary hover:text-nexa-text rounded bg-nexa-bg border border-nexa-border-subtle"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Rate Tier Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">
                    Pricing Category Tier
                  </label>
                  <select
                    value={selectedCategoryRate}
                    onChange={(e) => setSelectedCategoryRate(Number(e.target.value))}
                    className="w-full bg-nexa-bg border border-nexa-border-subtle text-nexa-text rounded-xl p-2.5 text-xs focus:ring-0 focus:border-nexa-mint/40"
                  >
                    {Object.keys(vehicleCategories).map((key) => (
                      <option key={key} value={Number(priceFor(key))}>
                        {labelFor(key)} (£{priceFor(key)}/veh)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Corporate Discount */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">
                    Corporate Discount (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(Number(e.target.value))}
                    className="w-full bg-nexa-bg border border-nexa-border-subtle text-nexa-text rounded-xl p-2.5 text-xs focus:ring-0 focus:border-nexa-mint/40"
                  />
                </div>

                {/* Additional Memo Notes */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">
                    Invoice Notes & Terms
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-nexa-bg border border-nexa-border-subtle text-nexa-text rounded-xl p-2.5 text-xs focus:ring-0 focus:border-nexa-mint/40 resize-none"
                  />
                </div>

                {/* Action Blocks */}
                <div className="space-y-3 pt-4 border-t border-nexa-border-subtle/50">
                  <button
                    onClick={handlePrint}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-nexa-mint/25 bg-nexa-mint/5 hover:bg-nexa-mint/10 text-nexa-mint text-xs font-semibold transition-all duration-300"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Invoice</span>
                  </button>

                  {selectedLead.status === 'new' && (
                    <button
                      onClick={() => handleMarkInvoiced(selectedLead.enquiryId)}
                      disabled={raisedSuccess}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-nexa-mint text-nexa-bg text-xs font-bold hover:bg-nexa-mint/90 transition-all duration-300"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{raisedSuccess ? 'Logged!' : 'Mark as Invoiced'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* MODAL RIGHT SIDE: REALISTIC INVOICE SHEET (Styled for printing as well) */}
              <div id="printable-invoice-container" className="flex-1 bg-white p-8 text-slate-800 font-sans print:p-0 print:text-black min-h-[600px] flex flex-col justify-between overflow-y-auto">
                <div className="space-y-8">
                  {/* INVOICE HEADER */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">NEXA AUTO CARE</h2>
                      <p className="text-xs text-slate-500">Professional Valeting & Fleet Care</p>
                      <p className="text-xs text-slate-500 mt-1">
                        77 Union St, Aberdeen, AB11 6BD<br />
                        billing@nexa-autocare.co.uk
                      </p>
                    </div>
                    <div className="text-right">
                      <h1 className="text-3xl font-light text-slate-400 tracking-wider">INVOICE</h1>
                      <p className="text-xs text-slate-500 mt-2 font-mono">
                        Invoice #: NX-{(selectedLead.enquiryId.slice(0, 5)).toUpperCase()}<br />
                        Date: {invoiceDate}<br />
                        Due Date: {dueDate}
                      </p>
                    </div>
                  </div>

                  {/* BILL TO SECTION */}
                  <div className="grid grid-cols-2 gap-6 border-t border-b border-slate-100 py-6">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Billed To:</p>
                      <h3 className="font-bold text-slate-900 text-sm">{selectedLead.companyName}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Attn: {selectedLead.contactPerson}<br />
                        {selectedLead.businessEmail}<br />
                        {selectedLead.businessPhone}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status:</p>
                      <span className={`inline-block text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full ${
                        selectedLead.status === 'invoiced'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {selectedLead.status === 'invoiced' ? 'Issued' : 'Draft'}
                      </span>
                    </div>
                  </div>

                  {/* LINE ITEMS TABLE */}
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5">Service Description</th>
                        <th className="py-2.5 text-center">Unit Rate</th>
                        <th className="py-2.5 text-center">Quantity</th>
                        <th className="py-2.5 text-right">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-4">
                          <strong className="font-semibold text-slate-800">Nexa Valet Package</strong>
                          <p className="text-[10px] text-slate-500 mt-0.5">Professional mobile wash and detail package (Tier rate)</p>
                        </td>
                        <td className="py-4 text-center font-mono">£{selectedCategoryRate.toFixed(2)}</td>
                        <td className="py-4 text-center">{selectedLead.fleetSize}</td>
                        <td className="py-4 text-right font-mono font-semibold">£{rawSubtotal.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="py-4">
                          <strong className="font-semibold text-slate-800">Booking Fee</strong>
                          <p className="text-[10px] text-slate-500 mt-0.5">Nexa secure platform match fee per vehicle</p>
                        </td>
                        <td className="py-4 text-center font-mono">£{bookingFee}</td>
                        <td className="py-4 text-center">{selectedLead.fleetSize}</td>
                        <td className="py-4 text-right font-mono font-semibold">£{bookingFees.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* PRICING TOTAL SUMMARY */}
                <div className="mt-12 border-t border-slate-200 pt-6">
                  <div className="flex flex-col md:flex-row md:justify-between items-start gap-6">
                    <div className="max-w-xs text-xs text-slate-500">
                      <p className="font-bold text-slate-700 mb-1">Invoice Notes</p>
                      <p className="leading-relaxed">{notes}</p>
                    </div>

                    <div className="w-full md:w-80 space-y-2 text-xs font-mono">
                      <div className="flex justify-between text-slate-500">
                        <span>Fleet Subtotal:</span>
                        <span>£{rawSubtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Platform Match Fees:</span>
                        <span>+£{bookingFees.toFixed(2)}</span>
                      </div>
                      {discountPercent > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Corp Discount ({discountPercent}%):</span>
                          <span>-£{discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-slate-200 pt-2.5 font-bold text-sm text-slate-900">
                        <span className="font-sans">Total Balance Due:</span>
                        <span>£{totalDue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
