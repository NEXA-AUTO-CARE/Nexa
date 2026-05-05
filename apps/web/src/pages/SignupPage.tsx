import { zodResolver } from '@hookform/resolvers/zod'
import { UserRole } from '@nexa/shared'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../contexts/AuthContext'
import { describeError } from '../lib/errors'

const schema = z.object({
  identifier: z.string().min(3, 'Email or phone required'),
  displayName: z.string().min(1, 'Required').max(100),
  role: z.enum([UserRole.CUSTOMER, UserRole.VENDOR]),
})

type FormValues = z.infer<typeof schema>

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', displayName: '', role: UserRole.CUSTOMER },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      await signup(values)
      navigate('/verify-otp', { state: { identifier: values.identifier } })
    } catch (err) {
      setServerError(describeError(err))
    }
  })

  return (
    <AuthLayout
      title="Create your Nexa account"
      subtitle="Use your email or UK mobile number"
      footer={
        <>
          Already have an account?{' '}
          <Link className="text-brand-600 hover:underline" to="/login">
            Log in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Email or phone" error={errors.identifier?.message}>
          <input
            className={inputCls}
            placeholder="you@example.com or +44…"
            autoComplete="username"
            {...register('identifier')}
          />
        </Field>
        <Field label="Display name" error={errors.displayName?.message}>
          <input className={inputCls} placeholder="Alex Smith" {...register('displayName')} />
        </Field>
        <Field label="I am a" error={errors.role?.message}>
          <select className={inputCls} {...register('role')}>
            <option value={UserRole.CUSTOMER}>Customer (book a wash)</option>
            <option value={UserRole.VENDOR}>Vendor (provide detailing)</option>
          </select>
        </Field>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <button className={btnPrimaryCls} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Sending OTP…' : 'Send verification code'}
        </button>
      </form>
    </AuthLayout>
  )
}

export const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'
export const btnPrimaryCls =
  'w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50'

export function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  )
}
