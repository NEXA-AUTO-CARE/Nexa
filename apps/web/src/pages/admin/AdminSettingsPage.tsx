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
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Faq {
  question: string
  answer: string
}

interface CategoryPricing {
  standard: string
  grande: string
  maxi: string
  transit: string
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [pricing, setPricing] = useState<CategoryPricing>({
    standard: '25.00',
    grande: '30.00',
    maxi: '35.00',
    transit: '40.00',
  })
  const [bookingFee, setBookingFee] = useState('1.49')
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [terms, setTerms] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  const loadSettings = async () => {
    try {
      setLoading(true)
      const { data } = await api.get<{ key: string; value: string }[]>('/settings')
      
      const pricingSetting = data.find((s) => s.key === 'car_category_pricing')
      const bookingFeeSetting = data.find((s) => s.key === 'booking_fee')
      const faqsSetting = data.find((s) => s.key === 'faqs')
      const termsSetting = data.find((s) => s.key === 'terms_and_conditions')

      if (pricingSetting) {
        setPricing(JSON.parse(pricingSetting.value))
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
    } catch (err) {
      console.error(err)
      setErrorMsg('Failed to load system settings from database.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
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

  // Pricing Change
  const handlePriceChange = (category: keyof CategoryPricing, val: string) => {
    setPricing({
      ...pricing,
      [category]: val,
    })
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
            Control service pricing, customer legal agreements, and public FAQ landing sections.
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
        {/* CARD 1: DYNAMIC CATEGORY PRICING */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-nexa-border-subtle/50 pb-4 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-nexa-mint/15 flex items-center justify-center text-nexa-mint">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-nexa-text">Car Category Pricing</h3>
                <p className="text-xs text-nexa-text-secondary">Set base valeting rates by vehicle type</p>
              </div>
            </div>
            <button
              onClick={() => handleSaveSetting('car_category_pricing', JSON.stringify(pricing))}
              disabled={saveLoading === 'car_category_pricing'}
              className="flex items-center gap-2 py-2 px-4 rounded-xl bg-nexa-mint text-nexa-bg text-xs font-bold hover:bg-nexa-mint/90 transition-all duration-300 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saveLoading === 'car_category_pricing' ? 'Saving...' : 'Save Pricing'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(Object.keys(pricing) as Array<keyof CategoryPricing>).map((category) => (
              <div key={category} className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-nexa-text-secondary capitalize">
                  {category}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nexa-text-secondary text-sm font-semibold">
                    £
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={pricing[category]}
                    onChange={(e) => handlePriceChange(category, e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-nexa-border-subtle bg-nexa-bg/40 focus:border-nexa-mint/40 focus:ring-0 text-sm text-nexa-text transition-all duration-300"
                  />
                </div>
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
                <p className="text-xs text-nexa-text-secondary">Set the flat booking & protection fee added to every booking</p>
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
      </div>
    </div>
  )
}
