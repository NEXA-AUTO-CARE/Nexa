import { useEffect, useState } from 'react'
import { api } from '../../lib/api-client'
import {
  DollarSign,
  HelpCircle,
  FileText,
  Save,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Eye,
  Mail,
  RotateCcw,
  Clock,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Faq {
  question: string
  answer: string
}

interface TimeSlot {
  key: string
  label: string
  hour: number
}

interface CategoryItem {
  key: string
  displayName: string
  price: number
  scheduledPrice: number | null
  activeFrom: string | null
  description: string
  examples: string
  seatingCapacity: string
}

interface Faq {
  question: string
  answer: string
}

interface TimeSlot {
  key: string
  label: string
  hour: number
}

interface StatusTemplate {
  title: string
  emailBody: string
  smsBody: string
}

type MessageTemplates = Record<string, StatusTemplate>

const TEMPLATE_STATUSES = [
  { key: 'booked', label: 'Booked' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
] as const

const PLACEHOLDERS = [
  '{{customerName}}',
  '{{vehicleSummary}}',
  '{{bookingTime}}',
  '{{serviceType}}',
  '{{bookingId}}',
  '{{bookingRef}}',
  '{{transactionRef}}',
]

const DEFAULT_TEMPLATES: MessageTemplates = {
  booked: {
    title: 'Booking Confirmed',
    emailBody: "Your booking (Ref: {{bookingRef}} / TXN: {{transactionRef}}) for {{vehicleSummary}} on {{bookingTime}} has been confirmed. We'll notify you when a detailer accepts.",
    smsBody: "NEXA: Your booking (Ref: {{bookingRef}}) for {{vehicleSummary}} on {{bookingTime}} has been confirmed. We'll notify you when a detailer accepts.",
  },
  accepted: {
    title: 'Booking Accepted',
    emailBody: "Great news! A detailer has accepted your booking (Ref: {{bookingRef}} / TXN: {{transactionRef}}) for {{vehicleSummary}}. They'll arrive on {{bookingTime}}.",
    smsBody: "NEXA: Great news! A detailer has accepted your booking (Ref: {{bookingRef}}) for {{vehicleSummary}}. They'll arrive on {{bookingTime}}.",
  },
  in_progress: {
    title: 'Detailing In Progress',
    emailBody: 'Your detailer is now working on {{vehicleSummary}} (Ref: {{bookingRef}} / TXN: {{transactionRef}}). Sit back and relax!',
    smsBody: 'NEXA: Your detailer is now working on {{vehicleSummary}} (Ref: {{bookingRef}}). Sit back and relax!',
  },
  completed: {
    title: 'Wash Complete',
    emailBody: "Your {{vehicleSummary}} (Ref: {{bookingRef}} / TXN: {{transactionRef}}) is looking fresh! Your wash is complete. We'd love to hear your feedback.",
    smsBody: "NEXA: Your {{vehicleSummary}} (Ref: {{bookingRef}}) is looking fresh! Your wash is complete. We'd love to hear your feedback.",
  },
  cancelled: {
    title: 'Booking Cancelled',
    emailBody: 'Your booking (Ref: {{bookingRef}} / TXN: {{transactionRef}}) for {{vehicleSummary}} on {{bookingTime}} has been cancelled.',
    smsBody: 'NEXA: Your booking (Ref: {{bookingRef}}) for {{vehicleSummary}} on {{bookingTime}} has been cancelled.',
  },
}

const DEFAULT_CATEGORIES: CategoryItem[] = [
  {
    key: 'small_car',
    displayName: 'Small Car',
    price: 40.00,
    scheduledPrice: null,
    activeFrom: null,
    description: 'Subcompact hatchbacks, City cars, Small-segment hatchbacks',
    examples: 'Fiat 500, Toyota Aygo, Toyota Yaris, Mini, VW Polo, VW Golf, Vauxhall Corsa',
    seatingCapacity: '4 to 5 seats',
  },
  {
    key: 'family_car',
    displayName: 'Family Car',
    price: 50.00,
    scheduledPrice: null,
    activeFrom: null,
    description: 'Mid-size sedans, Compact family hatchbacks, Crossover SUVs',
    examples: 'Ford Focus, Audi A3, Tesla Model 3 / Model Y, Vauxhall Mokka, Mercedes-Benz C-Class / E-Class, Hyundai Tucson, Nissan Qashqai, Kia Sportage, BMW X3, Range Rover Evoque',
    seatingCapacity: '5 seats',
  },
  {
    key: 'large_suv_van',
    displayName: 'Large SUV / 7-Seater / Van',
    price: 60.00,
    scheduledPrice: null,
    activeFrom: null,
    description: 'Full-size luxury SUVs, 7-seater passenger vehicles, Multi-purpose vans',
    examples: 'Land Rover Discovery, Range Rover Velar, Audi Q7, BMW X5, Kia Sorento, VW Transporter',
    seatingCapacity: '7+ seats / Van',
  },
]

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [categories, setCategories] = useState<CategoryItem[]>(DEFAULT_CATEGORIES)
  const [bookingFee, setBookingFee] = useState('1.49')
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [terms, setTerms] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [templates, setTemplates] = useState<MessageTemplates>(() => structuredClone(DEFAULT_TEMPLATES))
  const [activeTemplateTab, setActiveTemplateTab] = useState<string>('booked')
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<{ key: string; value: string }[]>('/settings')

      const categoriesSetting = data.find((s) => s.key === 'vehicle_categories')
      const pricingSetting = data.find((s) => s.key === 'car_category_pricing')
      const bookingFeeSetting = data.find((s) => s.key === 'booking_fee')
      const faqsSetting = data.find((s) => s.key === 'faqs')
      const termsSetting = data.find((s) => s.key === 'terms_and_conditions')
      const templatesSetting = data.find((s) => s.key === 'notification_templates')
      const timeSlotsSetting = data.find((s) => s.key === 'booking_time_slots')

      if (categoriesSetting && categoriesSetting.value) {
        try {
          const raw = JSON.parse(categoriesSetting.value) as Record<string, any>
          const items: CategoryItem[] = Object.keys(raw).map((k) => {
            const item = raw[k]
            return {
              key: k,
              displayName: item.display_name ?? item.displayName ?? k,
              price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price ?? 0)),
              scheduledPrice: item.scheduledPrice !== undefined && item.scheduledPrice !== null
                ? (typeof item.scheduledPrice === 'number' ? item.scheduledPrice : parseFloat(String(item.scheduledPrice)))
                : null,
              activeFrom: item.activeFrom ?? null,
              description: item.description ?? (Array.isArray(item.vehicle_types) ? item.vehicle_types.join(', ') : ''),
              examples: Array.isArray(item.examples) ? item.examples.join(', ') : (item.examples ?? ''),
              seatingCapacity: item.metrics?.seating_capacity ?? item.seatingCapacity ?? '',
            }
          })
          if (items.length > 0) {
            setCategories(items)
          }
        } catch { /* ignore parse error */ }
      } else if (pricingSetting && pricingSetting.value) {
        try {
          const rawPricing = JSON.parse(pricingSetting.value) as Record<string, any>
          const items = DEFAULT_CATEGORIES.map((c) => ({
            ...c,
            price: typeof rawPricing[c.key] === 'number' ? rawPricing[c.key] : parseFloat(String(rawPricing[c.key] ?? c.price)),
          }))
          setCategories(items)
        } catch { /* ignore parse error */ }
      }

      if (bookingFeeSetting) {
        setBookingFee(bookingFeeSetting.value)
      }
      if (faqsSetting) {
        setFaqs(JSON.parse(faqsSetting.value))
      }
      if (termsSetting) {
        setTerms(termsSetting.value)
      }
      if (templatesSetting) {
        try {
          const parsed = JSON.parse(templatesSetting.value) as MessageTemplates
          setTemplates({ ...structuredClone(DEFAULT_TEMPLATES), ...parsed })
        } catch { /* ignore */ }
      }
      if (timeSlotsSetting) {
        try {
          setTimeSlots(JSON.parse(timeSlotsSetting.value))
        } catch { /* ignore */ }
      } else {
        setTimeSlots([
          { key: 'early_morning', label: 'Early Morning (7:00 AM)', hour: 7 },
          { key: 'morning', label: 'Morning (9:00 AM)', hour: 9 },
          { key: 'late_morning', label: 'Late Morning (11:00 AM)', hour: 11 },
          { key: 'afternoon', label: 'Afternoon (1:00 PM)', hour: 13 },
          { key: 'evening', label: 'Evening (4:00 PM)', hour: 16 },
          { key: 'late_evening', label: 'Late Evening (6:00 PM)', hour: 18 }
        ])
      }
    } catch (err) {
      console.error(err)
      setErrorMsg('Failed to load system settings from database.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setState is deferred behind await
    loadSettings()
  }, [])

  const handleSaveSetting = async (key: string, value: string) => {
    try {
      setSaveLoading(key)
      setErrorMsg(null)
      setSuccessMsg(null)

      await api.post(`/settings/${key}`, { value })

      setSuccessMsg(`Setting "${key.replace(/_/g, ' ')}" updated successfully.`)
    } catch (err) {
      console.error(err)
      setErrorMsg(`Failed to save setting for "${key}".`)
    } finally {
      setSaveLoading(null)
    }
  }

  // Save all category configurations & scheduled pricing
  const handleSaveCategories = async () => {
    try {
      setSaveLoading('vehicle_categories')
      setErrorMsg(null)
      setSuccessMsg(null)

      const richMap: Record<string, any> = {}
      const simplePricing: Record<string, number> = {}
      const simpleLabels: Record<string, string> = {}
      const simpleDescriptions: Record<string, string> = {}

      categories.forEach((cat) => {
        const cleanKey = cat.key.toLowerCase().trim().replace(/\s+/g, '_')
        richMap[cleanKey] = {
          key: cleanKey,
          display_name: cat.displayName,
          displayName: cat.displayName,
          price: Number(cat.price),
          scheduledPrice: cat.scheduledPrice !== null && !isNaN(Number(cat.scheduledPrice)) ? Number(cat.scheduledPrice) : null,
          activeFrom: cat.activeFrom || null,
          description: cat.description,
          vehicle_types: cat.description.split(',').map((s) => s.trim()).filter(Boolean),
          metrics: { seating_capacity: cat.seatingCapacity },
          examples: cat.examples.split(',').map((s) => s.trim()).filter(Boolean),
        }

        simplePricing[cleanKey] = Number(cat.price)
        simpleLabels[cleanKey] = cat.displayName
        simpleDescriptions[cleanKey] = cat.description
      })

      await api.post('/settings/vehicle_categories', { value: JSON.stringify(richMap) })
      await api.post('/settings/car_category_pricing', { value: JSON.stringify(simplePricing) })
      await api.post('/settings/vehicle_category_labels', { value: JSON.stringify(simpleLabels) })
      await api.post('/settings/vehicle_category_descriptions', { value: JSON.stringify(simpleDescriptions) })

      setSuccessMsg('Car categories, base rates, and scheduled prices updated successfully.')
    } catch (err) {
      console.error(err)
      setErrorMsg('Failed to save category pricing configurations.')
    } finally {
      setSaveLoading(null)
    }
  }

  const handleAddCategory = () => {
    const newKey = `category_${Date.now()}`
    setCategories([
      ...categories,
      {
        key: newKey,
        displayName: 'New Car Category',
        price: 45.00,
        scheduledPrice: null,
        activeFrom: null,
        description: 'Category description...',
        examples: 'Example Model 1, Example Model 2',
        seatingCapacity: '5 seats',
      },
    ])
  }

  const handleCategoryChange = (index: number, field: keyof CategoryItem, val: any) => {
    const updated = categories.map((c, i) => (i === index ? { ...c, [field]: val } : c))
    setCategories(updated)
  }

  const handleDeleteCategory = (index: number) => {
    setCategories(categories.filter((_, i) => i !== index))
  }

  // FAQ Mutations
  const handleAddFaq = () => {
    setFaqs([...faqs, { question: '', answer: '' }])
  }

  const handleFaqChange = (index: number, field: 'question' | 'answer', val: string) => {
    const updated = faqs.map((f, i) => (i === index ? { ...f, [field]: val } : f))
    setFaqs(updated)
  }

  const handleDeleteFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index))
  }

  // Time Slot Mutations
  const handleAddTimeSlot = () => {
    setTimeSlots([...timeSlots, { key: `slot_${Date.now()}`, label: 'New Slot (12:00 PM)', hour: 12 }])
  }

  const handleTimeSlotChange = (index: number, field: keyof TimeSlot, val: string | number) => {
    const updated = timeSlots.map((ts, i) => {
      if (i === index) {
        if (field === 'hour') {
          return { ...ts, [field]: Number(val) }
        }
        return { ...ts, [field]: val }
      }
      return ts
    })
    setTimeSlots(updated)
  }

  const handleDeleteTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index))
  }

  // Template mutations
  const handleTemplateChange = (
    status: string,
    field: keyof StatusTemplate,
    val: string,
  ) => {
    setTemplates((prev) => ({
      ...prev,
      [status]: { ...prev[status], [field]: val },
    }))
  }

  const handleResetTemplate = (status: string) => {
    const def = DEFAULT_TEMPLATES[status]
    if (!def) return
    setTemplates((prev) => ({
      ...prev,
      [status]: structuredClone(def),
    }))
  }

  // Auto-dismiss banners
  useEffect(() => {
    if (successMsg || errorMsg) {
      const t = setTimeout(() => {
        setSuccessMsg(null)
        setErrorMsg(null)
      }, 5000)
      return () => clearTimeout(t)
    }
  }, [successMsg, errorMsg])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-nexa-mint/30 border-t-nexa-mint" />
        <span className="text-nexa-text-secondary text-sm">Loading dynamic system settings…</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-3xl text-nexa-text tracking-tight">
            Dynamic Settings
          </h1>
          <p className="text-nexa-text-secondary text-sm">
            Manage car categories, base prices, scheduled pricing active dates, customer legal terms, and FAQs.
          </p>
        </div>
      </div>

      {/* NOTIFICATION BANNERS */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl border border-nexa-mint/35 bg-nexa-mint/5 text-nexa-mint text-sm flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-xl border border-nexa-error/35 bg-nexa-error/5 text-nexa-error text-sm flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-12">
        {/* CARD 1: DYNAMIC CATEGORY & SCHEDULED PRICING MANAGER */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-3 border-b border-nexa-border-subtle/50 pb-4 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-nexa-mint/15 flex items-center justify-center text-nexa-mint">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-nexa-text">Car Category & Scheduled Pricing</h3>
                <p className="text-xs text-nexa-text-secondary">Configure categories, decimal base rates, and scheduled active dates</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddCategory}
                className="flex items-center gap-1.5 py-2 px-3 rounded-xl border border-nexa-border-subtle bg-nexa-bg hover:bg-nexa-bg-elevated text-xs font-semibold text-nexa-text transition-all duration-300"
              >
                <Plus className="w-4 h-4 text-nexa-mint" />
                <span>Add Category</span>
              </button>
              <button
                onClick={handleSaveCategories}
                disabled={saveLoading === 'vehicle_categories'}
                className="flex items-center gap-2 py-2 px-4 rounded-xl bg-nexa-mint text-nexa-bg text-xs font-bold hover:bg-nexa-mint/90 transition-all duration-300 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saveLoading === 'vehicle_categories' ? 'Saving...' : 'Save Categories'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {categories.map((cat, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl border border-nexa-border-subtle/70 bg-nexa-bg/30 space-y-4 relative group"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category Key */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-nexa-text-secondary">
                      Internal Key (lowercase)
                    </label>
                    <input
                      type="text"
                      value={cat.key}
                      onChange={(e) => handleCategoryChange(idx, 'key', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      className="w-full px-3.5 py-2 rounded-xl border border-nexa-border-subtle bg-nexa-bg/60 text-xs font-mono text-nexa-text focus:border-nexa-mint/40"
                    />
                  </div>

                  {/* Display Name */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-nexa-text-secondary">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={cat.displayName}
                      onChange={(e) => handleCategoryChange(idx, 'displayName', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-nexa-border-subtle bg-nexa-bg/60 text-xs font-semibold text-nexa-text focus:border-nexa-mint/40"
                    />
                  </div>

                  {/* Seating Capacity */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-nexa-text-secondary">
                      Seating / Capacity
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 5 seats"
                      value={cat.seatingCapacity}
                      onChange={(e) => handleCategoryChange(idx, 'seatingCapacity', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-nexa-border-subtle bg-nexa-bg/60 text-xs text-nexa-text focus:border-nexa-mint/40"
                    />
                  </div>
                </div>

                {/* PRICING & SCHEDULING ROW */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-nexa-border-subtle/40">
                  {/* Base Price */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-nexa-text-secondary">
                      Base Rate (£ Decimal)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-nexa-text-secondary text-xs">£</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cat.price}
                        onChange={(e) => handleCategoryChange(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="w-full pl-7 pr-3 py-2 rounded-xl border border-nexa-border-subtle bg-nexa-bg/60 text-xs font-bold text-nexa-mint focus:border-nexa-mint/40"
                      />
                    </div>
                  </div>

                  {/* Scheduled Price */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-nexa-text-secondary">
                      Scheduled New Rate (£ Decimal)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-nexa-text-secondary text-xs">£</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Optional"
                        value={cat.scheduledPrice !== null ? cat.scheduledPrice : ''}
                        onChange={(e) =>
                          handleCategoryChange(
                            idx,
                            'scheduledPrice',
                            e.target.value !== '' ? parseFloat(e.target.value) : null
                          )
                        }
                        className="w-full pl-7 pr-3 py-2 rounded-xl border border-nexa-border-subtle bg-nexa-bg/60 text-xs text-amber-400 focus:border-amber-400/40"
                      />
                    </div>
                  </div>

                  {/* Active From Date */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-nexa-text-secondary">
                      Scheduled Active Date &amp; Time
                    </label>
                    <input
                      type="datetime-local"
                      value={cat.activeFrom ? cat.activeFrom.slice(0, 16) : ''}
                      onChange={(e) =>
                        handleCategoryChange(
                          idx,
                          'activeFrom',
                          e.target.value ? new Date(e.target.value).toISOString() : null
                        )
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-nexa-border-subtle bg-nexa-bg/60 text-xs text-nexa-text focus:border-nexa-mint/40"
                    />
                  </div>
                </div>

                {/* DESCRIPTIONS & EXAMPLES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-nexa-text-secondary">
                      Vehicle Types / Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Subcompact hatchbacks, City cars"
                      value={cat.description}
                      onChange={(e) => handleCategoryChange(idx, 'description', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-nexa-border-subtle bg-nexa-bg/60 text-xs text-nexa-text-secondary focus:border-nexa-mint/40"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-nexa-text-secondary">
                      Example Car Models (Comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Fiat 500, Toyota Aygo, VW Polo"
                      value={cat.examples}
                      onChange={(e) => handleCategoryChange(idx, 'examples', e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-nexa-border-subtle bg-nexa-bg/60 text-xs text-nexa-text-secondary focus:border-nexa-mint/40"
                    />
                  </div>
                </div>

                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(idx)}
                  className="absolute top-4 right-4 p-2 text-nexa-text-secondary hover:text-nexa-error rounded-xl hover:bg-nexa-error/10 transition-all duration-300"
                  title="Remove category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* CARD 1.5: BOOKING FEE */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-nexa-border-subtle/50 pb-4 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-nexa-mint/15 flex items-center justify-center text-nexa-mint">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-nexa-text">Booking Fee</h3>
                <p className="text-xs text-nexa-text-secondary">Set the flat booking fee added to every booking</p>
              </div>
            </div>
            <button
              onClick={() => handleSaveSetting('booking_fee', bookingFee)}
              disabled={saveLoading === 'booking_fee'}
              className="flex items-center gap-2 py-2 px-4 rounded-xl bg-nexa-mint text-nexa-bg text-xs font-bold hover:bg-nexa-mint/90 transition-all duration-300 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saveLoading === 'booking_fee' ? 'Saving...' : 'Save Fee'}</span>
            </button>
          </div>

          <div className="max-w-xs space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">
              Fee Amount
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nexa-text-secondary text-sm font-semibold">
                £
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={bookingFee}
                onChange={(e) => setBookingFee(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg/40 focus:border-nexa-mint/40 focus:ring-0 text-sm text-nexa-text transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* CARD 1.6: BOOKING TIME SLOTS */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-nexa-border-subtle/50 pb-4 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-nexa-mint/15 flex items-center justify-center text-nexa-mint">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-nexa-text">Booking Time Slots</h3>
                <p className="text-xs text-nexa-text-secondary">Configure available wash timeslots for customers (seasonal scheduling)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddTimeSlot}
                className="flex items-center gap-1.5 py-2 px-3 rounded-xl border border-nexa-border-subtle bg-nexa-bg hover:bg-nexa-bg-elevated text-xs font-semibold text-nexa-text transition-all duration-300"
              >
                <Plus className="w-4 h-4 text-nexa-mint" />
                <span>Add Time Slot</span>
              </button>
              <button
                onClick={() => handleSaveSetting('booking_time_slots', JSON.stringify(timeSlots))}
                disabled={saveLoading === 'booking_time_slots'}
                className="flex items-center gap-2 py-2 px-4 rounded-xl bg-nexa-mint text-nexa-bg text-xs font-bold hover:bg-nexa-mint/90 transition-all duration-300 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saveLoading === 'booking_time_slots' ? 'Saving...' : 'Save Time Slots'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 divide-y divide-nexa-border-subtle/50">
            {timeSlots.map((slot, idx) => (
              <div key={idx} className="pt-6 first:pt-0 flex gap-4 items-start group">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-nexa-text-secondary">
                      Internal Key (lowercase, no spaces)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. morning"
                      value={slot.key}
                      onChange={(e) => handleTimeSlotChange(idx, 'key', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg/40 focus:border-nexa-mint/40 focus:ring-0 text-sm text-nexa-text transition-all duration-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-nexa-text-secondary">
                      Display Label
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Morning (9:00 AM)"
                      value={slot.label}
                      onChange={(e) => handleTimeSlotChange(idx, 'label', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg/40 focus:border-nexa-mint/40 focus:ring-0 text-sm text-nexa-text transition-all duration-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-nexa-text-secondary">
                      Start Hour (24h format: 0-23)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      placeholder="e.g. 9"
                      value={slot.hour}
                      onChange={(e) => handleTimeSlotChange(idx, 'hour', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg/40 focus:border-nexa-mint/40 focus:ring-0 text-sm text-nexa-text transition-all duration-300"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteTimeSlot(idx)}
                  className="mt-6 p-2.5 text-nexa-text-secondary hover:text-nexa-error rounded-xl hover:bg-nexa-error/10 border border-transparent transition-all duration-300"
                  title="Remove time slot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {timeSlots.length === 0 && (
              <div className="text-center py-8 text-nexa-text-secondary text-xs">
                No time slots currently. Click "Add Time Slot" to define one.
              </div>
            )}
          </div>
        </div>

        {/* CARD 2: FAQ MANAGER */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-nexa-border-subtle/50 pb-4 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-nexa-text">Public FAQs Manager</h3>
                <p className="text-xs text-nexa-text-secondary">Add, update, or remove question and answer listings</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddFaq}
                className="flex items-center gap-1.5 py-2 px-3 rounded-xl border border-nexa-border-subtle bg-nexa-bg hover:bg-nexa-bg-elevated text-xs font-semibold text-nexa-text transition-all duration-300"
              >
                <Plus className="w-4 h-4 text-nexa-mint" />
                <span>Add FAQ</span>
              </button>
              <button
                onClick={() => handleSaveSetting('faqs', JSON.stringify(faqs))}
                disabled={saveLoading === 'faqs'}
                className="flex items-center gap-2 py-2 px-4 rounded-xl bg-nexa-mint text-nexa-bg text-xs font-bold hover:bg-nexa-mint/90 transition-all duration-300 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saveLoading === 'faqs' ? 'Saving...' : 'Save FAQs'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 divide-y divide-nexa-border-subtle/50">
            {faqs.map((faq, idx) => (
              <div key={idx} className="pt-6 first:pt-0 flex gap-4 items-start group">
                <div className="flex-1 space-y-3">
                  <input
                    type="text"
                    placeholder="Enter the question..."
                    value={faq.question}
                    onChange={(e) => handleFaqChange(idx, 'question', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg/40 focus:border-nexa-mint/40 focus:ring-0 text-sm text-nexa-text font-semibold transition-all duration-300"
                  />
                  <textarea
                    rows={2}
                    placeholder="Enter the answer..."
                    value={faq.answer}
                    onChange={(e) => handleFaqChange(idx, 'answer', e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg/40 focus:border-nexa-mint/40 focus:ring-0 text-xs text-nexa-text-secondary transition-all duration-300"
                  />
                </div>
                <button
                  onClick={() => handleDeleteFaq(idx)}
                  className="mt-2 p-2.5 text-nexa-text-secondary hover:text-nexa-error rounded-xl hover:bg-nexa-error/10 border border-transparent transition-all duration-300"
                  title="Remove FAQ card"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {faqs.length === 0 && (
              <div className="text-center py-8 text-nexa-text-secondary text-xs">
                No FAQs currently. Click "Add FAQ" to add a new card.
              </div>
            )}
          </div>
        </div>

        {/* CARD 3: TERMS & CONDITIONS */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-nexa-border-subtle/50 pb-4 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-nexa-text">Terms & Conditions</h3>
                <p className="text-xs text-nexa-text-secondary">Draft checkout legal summaries and service warranties (Markdown supported)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 py-2 px-3 rounded-xl border border-nexa-border-subtle bg-nexa-bg hover:bg-nexa-bg-elevated text-xs font-semibold text-nexa-text transition-all duration-300"
              >
                <Eye className="w-4 h-4 text-nexa-mint" />
                <span>{showPreview ? 'Edit Editor' : 'Live Preview'}</span>
              </button>
              <button
                onClick={() => handleSaveSetting('terms_and_conditions', terms)}
                disabled={saveLoading === 'terms_and_conditions'}
                className="flex items-center gap-2 py-2 px-4 rounded-xl bg-nexa-mint text-nexa-bg text-xs font-bold hover:bg-nexa-mint/90 transition-all duration-300 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saveLoading === 'terms_and_conditions' ? 'Saving...' : 'Save T&Cs'}</span>
              </button>
            </div>
          </div>

          <div>
            {showPreview ? (
              <div className="p-6 rounded-xl bg-nexa-bg border border-nexa-border-subtle/50 max-h-[350px] overflow-y-auto text-xs text-nexa-text-secondary leading-relaxed whitespace-pre-wrap font-sans">
                {terms}
              </div>
            ) : (
              <textarea
                rows={10}
                placeholder="Draft booking legal policy here..."
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-nexa-border-subtle bg-nexa-bg/40 focus:border-nexa-mint/40 focus:ring-0 text-xs text-nexa-text-secondary leading-relaxed font-mono transition-all duration-300"
              />
            )}
          </div>
        </div>

        {/* CARD 4: NOTIFICATION TEMPLATES */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-nexa-border-subtle/50 pb-4 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-nexa-text">Notification Templates</h3>
                <p className="text-xs text-nexa-text-secondary">
                  Customise email &amp; SMS messages sent to customers for each booking status
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                handleSaveSetting('notification_templates', JSON.stringify(templates))
              }
              disabled={saveLoading === 'notification_templates'}
              className="flex items-center gap-2 py-2 px-4 rounded-xl bg-nexa-mint text-nexa-bg text-xs font-bold hover:bg-nexa-mint/90 transition-all duration-300 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>
                {saveLoading === 'notification_templates'
                  ? 'Saving...'
                  : 'Save Templates'}
              </span>
            </button>
          </div>

          {/* Placeholder reference chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-nexa-text-secondary">
              Available Placeholders:
            </span>
            {PLACEHOLDERS.map((p) => (
              <span
                key={p}
                className="px-2.5 py-1 rounded-lg bg-nexa-bg border border-nexa-border-subtle text-[11px] font-mono text-amber-400/90 select-all cursor-pointer hover:bg-amber-500/10 transition-colors duration-200"
                title="Click to select, then paste into a template field"
              >
                {p}
              </span>
            ))}
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {TEMPLATE_STATUSES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTemplateTab(key)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                  activeTemplateTab === key
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-nexa-text-secondary hover:text-nexa-text hover:bg-nexa-bg-elevated border border-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Active tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTemplateTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="space-y-5"
            >
              {/* Title */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">
                  Subject / Title
                </label>
                <input
                  type="text"
                  value={templates[activeTemplateTab]?.title ?? ''}
                  onChange={(e) =>
                    handleTemplateChange(activeTemplateTab, 'title', e.target.value)
                  }
                  placeholder="e.g. Booking Confirmed"
                  className="w-full px-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg/40 focus:border-amber-500/40 focus:ring-0 text-sm text-nexa-text transition-all duration-300"
                />
              </div>

              {/* Email Body */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">
                  Email Body
                </label>
                <textarea
                  rows={3}
                  value={templates[activeTemplateTab]?.emailBody ?? ''}
                  onChange={(e) =>
                    handleTemplateChange(activeTemplateTab, 'emailBody', e.target.value)
                  }
                  placeholder="Email message body — use {{placeholders}} for dynamic values"
                  className="w-full px-4 py-3 rounded-xl border border-nexa-border-subtle bg-nexa-bg/40 focus:border-amber-500/40 focus:ring-0 text-xs text-nexa-text-secondary leading-relaxed font-mono transition-all duration-300"
                />
              </div>

              {/* SMS Body */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-nexa-text-secondary">
                  SMS Body
                </label>
                <textarea
                  rows={2}
                  value={templates[activeTemplateTab]?.smsBody ?? ''}
                  onChange={(e) =>
                    handleTemplateChange(activeTemplateTab, 'smsBody', e.target.value)
                  }
                  placeholder="SMS text — keep concise (160 chars ideal)"
                  className="w-full px-4 py-3 rounded-xl border border-nexa-border-subtle bg-nexa-bg/40 focus:border-amber-500/40 focus:ring-0 text-xs text-nexa-text-secondary leading-relaxed font-mono transition-all duration-300"
                />
                <p className="text-[11px] text-nexa-text-secondary/60">
                  {(templates[activeTemplateTab]?.smsBody ?? '').length} characters
                </p>
              </div>

              {/* Reset button */}
              <div className="flex justify-end">
                <button
                  onClick={() => handleResetTemplate(activeTemplateTab)}
                  className="flex items-center gap-1.5 py-2 px-3 rounded-xl border border-nexa-border-subtle bg-nexa-bg hover:bg-nexa-bg-elevated text-xs font-semibold text-nexa-text-secondary hover:text-nexa-text transition-all duration-300"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to Default</span>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
