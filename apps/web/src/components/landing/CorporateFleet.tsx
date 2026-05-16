import { useState } from 'react'

export function CorporateFleet() {
  const [formData, setFormData] = useState({
    companyName: '',
    fleetSize: '',
    contactPerson: '',
    businessEmail: '',
    businessPhone: '',
  })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/fleet/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Failed to submit')
      setStatus('success')
      setFormData({ companyName: '', fleetSize: '', contactPerson: '', businessEmail: '', businessPhone: '' })
    } catch {
      setStatus('error')
    }
  }

  return (
    <section id="corporate-fleet" className="px-6 py-20 md:py-28 bg-nexa-bg-elevated/30">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
          <div>
            <h2 className="text-3xl font-bold leading-tight md:text-4xl text-white">
              <span className="font-display">Corporate Fleet Services</span>
            </h2>
            <p className="mt-4 text-nexa-text-secondary text-lg max-w-md">
              Keep your company vehicles looking professional and pristine. Partner with us for reliable, top-tier corporate fleet detailing.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                'Priority scheduling & dedicated account manager',
                'Customized maintenance plans for your fleet',
                'Monthly consolidated invoicing',
                'On-site or drop-off service options',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-nexa-text-secondary">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-nexa-mint/20 text-nexa-mint">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="nexa-card p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">Request Fleet Pricing</h3>
            {status === 'success' ? (
              <div className="rounded-lg bg-nexa-mint/10 p-6 text-center text-nexa-mint">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-4">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p className="font-medium">Request Sent Successfully</p>
                <p className="text-sm mt-2 opacity-80">Our team will contact you shortly to discuss your fleet requirements.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-nexa-text-secondary mb-1">Company Name</label>
                  <input required className="nexa-input" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-nexa-text-secondary mb-1">Contact Person</label>
                    <input required className="nexa-input" value={formData.contactPerson} onChange={e => setFormData({ ...formData, contactPerson: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-nexa-text-secondary mb-1">Fleet Size</label>
                    <input required type="number" min="1" className="nexa-input" value={formData.fleetSize} onChange={e => setFormData({ ...formData, fleetSize: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-nexa-text-secondary mb-1">Business Email</label>
                    <input required type="email" className="nexa-input" value={formData.businessEmail} onChange={e => setFormData({ ...formData, businessEmail: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-nexa-text-secondary mb-1">Business Phone</label>
                    <input required type="tel" className="nexa-input" value={formData.businessPhone} onChange={e => setFormData({ ...formData, businessPhone: e.target.value })} />
                  </div>
                </div>
                {status === 'error' && <p className="text-sm text-nexa-error">Failed to send request. Please try again later.</p>}
                <button type="submit" disabled={status === 'submitting'} className="btn-primary w-full mt-2">
                  {status === 'submitting' ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
