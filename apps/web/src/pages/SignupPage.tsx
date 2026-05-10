import { zodResolver } from '@hookform/resolvers/zod'
import { UserRole } from '@nexa/shared'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../contexts/AuthContext'
import { describeError } from '../lib/errors'

const PHONE_RX = /^\+?[1-9]\d{6,14}$/

const schema = z
  .object({
    firstName: z.string().trim().min(1, 'First name is required').max(100),
    lastName: z.string().trim().min(1, 'Last name is required').max(100),
    email: z.string().trim().email('Invalid email').max(255).or(z.literal('')),
    phoneNumber: z
      .string()
      .trim()
      .regex(PHONE_RX, 'Use international format, e.g. +447700900123')
      .or(z.literal('')),
    role: z.enum([UserRole.CUSTOMER, UserRole.VENDOR]),
    otpChannel: z.enum(['email', 'phone']),
    displayName: z.string().trim().max(100).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.email && !data.phoneNumber) {
      ctx.addIssue({
        code: 'custom',
        path: ['email'],
        message: 'Provide an email or a phone number',
      })
    }
    if (data.otpChannel === 'email' && !data.email) {
      ctx.addIssue({
        code: 'custom',
        path: ['email'],
        message: 'Email is required for OTP via email',
      })
    }
    if (data.otpChannel === 'phone' && !data.phoneNumber) {
      ctx.addIssue({
        code: 'custom',
        path: ['phoneNumber'],
        message: 'Phone number is required for OTP via SMS',
      })
    }
  })

type FormValues = z.infer<typeof schema>

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      displayName: '',
      role: UserRole.CUSTOMER,
      otpChannel: 'email',
    },
  })

  const otpChannel = watch('otpChannel')

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      const email = values.email.trim() || null
      const phoneNumber = values.phoneNumber.trim() || null
      await signup({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email,
        phoneNumber,
        role: values.role,
        otpChannel: values.otpChannel,
        displayName: values.displayName?.trim() || undefined,
      })
      const identifier = values.otpChannel === 'email' ? email! : phoneNumber!
      navigate('/verify-otp', { state: { identifier } })
    } catch (err) {
      setServerError(describeError(err))
    }
  })

  return (
    <AuthLayout
      title="Create your Nexa account"
      subtitle="Tell us a bit about you and where to send your verification code"
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" error={errors.firstName?.message}>
            <input className={inputCls} autoComplete="given-name" {...register('firstName')} />
          </Field>
          <Field label="Last name" error={errors.lastName?.message}>
            <input className={inputCls} autoComplete="family-name" {...register('lastName')} />
          </Field>
        </div>
        <Field label="Email" error={errors.email?.message}>
          <input
            className={inputCls}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...register('email')}
          />
        </Field>
        <Field label="Phone number" error={errors.phoneNumber?.message}>
          <input
            className={inputCls}
            placeholder="+447700900123"
            autoComplete="tel"
            {...register('phoneNumber')}
          />
        </Field>
        <Field label="Display name (optional)" error={errors.displayName?.message}>
          <input
            className={inputCls}
            placeholder="Defaults to your full name"
            {...register('displayName')}
          />
        </Field>
        <Field label="I am a" error={errors.role?.message}>
          <select className={inputCls} {...register('role')}>
            <option value={UserRole.CUSTOMER}>Customer (book a wash)</option>
            <option value={UserRole.VENDOR}>Vendor (provide detailing)</option>
          </select>
        </Field>
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium text-gray-700">Send my verification code via</legend>
          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="email" {...register('otpChannel')} />
              <span>Email</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" value="phone" {...register('otpChannel')} />
              <span>SMS</span>
            </label>
          </div>
          {otpChannel === 'phone' && (
            <p className="pt-1 text-xs text-gray-500">
              Standard message rates may apply.
            </p>
          )}
        </fieldset>
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
