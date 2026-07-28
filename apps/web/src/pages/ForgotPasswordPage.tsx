import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../contexts/AuthContext'
import { describeError } from '../lib/errors'
import { Field, btnPrimaryCls, inputCls } from './SignupPage'

const identifierSchema = z.object({
  identifier: z.string().min(3, 'Please enter a valid email or phone number'),
})

const otpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Must be a 6-digit code'),
})

const passwordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

export function ForgotPasswordPage() {
  const { forgotPassword, verifyResetOtp, resetPassword } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<'request' | 'verify' | 'reset'>('request')
  const [identifier, setIdentifier] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Step 1: Identifier form
  const requestForm = useForm<z.infer<typeof identifierSchema>>({
    resolver: zodResolver(identifierSchema),
    defaultValues: { identifier: '' },
  })

  // Step 2: OTP form
  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: '' },
  })

  // Step 3: New Password form
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '', confirm: '' },
  })

  const handleRequestSubmit = requestForm.handleSubmit(async (values) => {
    setServerError(null)
    try {
      await forgotPassword(values.identifier)
      setIdentifier(values.identifier)
      setStep('verify')
    } catch (err) {
      setServerError(describeError(err))
    }
  })

  const handleOtpSubmit = otpForm.handleSubmit(async (values) => {
    setServerError(null)
    try {
      const token = await verifyResetOtp(identifier, values.code)
      setResetToken(token)
      setStep('reset')
    } catch (err) {
      setServerError(describeError(err))
    }
  })

  const handlePasswordSubmit = passwordForm.handleSubmit(async (values) => {
    setServerError(null)
    try {
      const user = await resetPassword(resetToken, values.password)
      if (user.role === 'admin' || user.role === 'superadmin') {
        navigate('/admin/dashboard', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setServerError(describeError(err))
    }
  })

  if (step === 'verify') {
    return (
      <AuthLayout
        title="Verify reset code"
        subtitle={`We sent a 6-digit verification code to ${identifier}.`}
        footer={
          <button
            type="button"
            className="text-nexa-mint hover:underline cursor-pointer"
            onClick={() => {
              setServerError(null)
              setStep('request')
            }}
          >
            Change email or phone
          </button>
        }
      >
        <form className="space-y-4" onSubmit={handleOtpSubmit}>
          <Field label="6-digit verification code" error={otpForm.formState.errors.code?.message}>
            <input
              className={inputCls}
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              placeholder="123456"
              {...otpForm.register('code')}
            />
          </Field>
          {serverError && <p className="text-sm text-nexa-error">{serverError}</p>}
          <button className={btnPrimaryCls} type="submit" disabled={otpForm.formState.isSubmitting}>
            {otpForm.formState.isSubmitting ? 'Verifying…' : 'Verify code'}
          </button>
        </form>
      </AuthLayout>
    )
  }

  if (step === 'reset') {
    return (
      <AuthLayout title="Create new password" subtitle="Must be at least 8 characters.">
        <form className="space-y-4" onSubmit={handlePasswordSubmit}>
          <Field label="New password" error={passwordForm.formState.errors.password?.message}>
            <div className="relative">
              <input
                className={`${inputCls} pr-10`}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                {...passwordForm.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-nexa-text-secondary hover:text-nexa-text focus:outline-none cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <Field label="Confirm new password" error={passwordForm.formState.errors.confirm?.message}>
            <div className="relative">
              <input
                className={`${inputCls} pr-10`}
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                {...passwordForm.register('confirm')}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-nexa-text-secondary hover:text-nexa-text focus:outline-none cursor-pointer"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          {serverError && <p className="text-sm text-nexa-error">{serverError}</p>}
          <button className={btnPrimaryCls} type="submit" disabled={passwordForm.formState.isSubmitting}>
            {passwordForm.formState.isSubmitting ? 'Resetting…' : 'Reset password & sign in'}
          </button>
        </form>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email or phone number and we'll send you a verification code."
      footer={
        <>
          Remembered your password?{' '}
          <Link className="text-nexa-mint hover:underline" to="/login">
            Log in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleRequestSubmit}>
        <Field label="Email or phone" error={requestForm.formState.errors.identifier?.message}>
          <input
            className={inputCls}
            placeholder="e.g. alex@example.com or +447123456789"
            autoComplete="username"
            {...requestForm.register('identifier')}
          />
        </Field>
        {serverError && <p className="text-sm text-nexa-error">{serverError}</p>}
        <button className={btnPrimaryCls} type="submit" disabled={requestForm.formState.isSubmitting}>
          {requestForm.formState.isSubmitting ? 'Sending code…' : 'Send verification code'}
        </button>
      </form>
    </AuthLayout>
  )
}
