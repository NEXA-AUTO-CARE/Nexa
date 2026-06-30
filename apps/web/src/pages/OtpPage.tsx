import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../contexts/AuthContext'
import { describeError } from '../lib/errors'
import { Field, btnPrimaryCls, inputCls } from './SignupPage'

const schema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Six digits'),
})

type FormValues = z.infer<typeof schema>

export function OtpPage() {
  const { verifyOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { identifier?: string } }
  const identifier = location.state?.identifier
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { code: '' } })

  if (!identifier) {
    return <Navigate to="/signup" replace />
  }

  const onSubmit = handleSubmit(async ({ code }) => {
    setServerError(null)
    try {
      const { setupToken } = await verifyOtp({ identifier, code })
      navigate('/set-password', { state: { setupToken } })
    } catch (err) {
      setServerError(describeError(err))
    }
  })

  return (
    <AuthLayout
      title="Verify your code"
      subtitle={`We sent a 6-digit code to ${identifier}.`}
      footer={
        <Link className="text-nexa-mint hover:underline" to="/signup">
          Use a different identifier
        </Link>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="6-digit code" error={errors.code?.message}>
          <input
            className={inputCls}
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="123456"
            {...register('code')}
          />
        </Field>
        {serverError && <p className="text-sm text-nexa-error">{serverError}</p>}
        <button className={btnPrimaryCls} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Verifying…' : 'Verify code'}
        </button>
      </form>
    </AuthLayout>
  )
}
