import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { AuthLayout } from '../components/AuthLayout'
import { useAuth } from '../contexts/AuthContext'
import { describeError } from '../lib/errors'
import { Field, btnPrimaryCls, inputCls } from './SignupPage'

const schema = z
  .object({
    password: z.string().min(8, 'At least 8 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

type FormValues = z.infer<typeof schema>

export function SetPasswordPage() {
  const { setPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { setupToken?: string } }
  const setupToken = location.state?.setupToken
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  })

  if (!setupToken) {
    return <Navigate to="/signup" replace />
  }

  const onSubmit = handleSubmit(async ({ password }) => {
    setServerError(null)
    try {
      const user = await setPassword({ setupToken, password })
      if (user.role === 'admin' || user.role === 'superadmin') {
        navigate('/admin/dashboard', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setServerError(describeError(err))
    }
  })

  return (
    <AuthLayout title="Set your password" subtitle="At least 8 characters.">
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Password" error={errors.password?.message}>
          <input
            className={inputCls}
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
        </Field>
        <Field label="Confirm password" error={errors.confirm?.message}>
          <input
            className={inputCls}
            type="password"
            autoComplete="new-password"
            {...register('confirm')}
          />
        </Field>
        {serverError && <p className="text-sm text-nexa-error">{serverError}</p>}
        <button className={btnPrimaryCls} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </AuthLayout>
  )
}
