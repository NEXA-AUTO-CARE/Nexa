import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

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
          <div className="relative">
            <input
              className={`${inputCls} pr-10`}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('password')}
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
        <Field label="Confirm password" error={errors.confirm?.message}>
          <div className="relative">
            <input
              className={`${inputCls} pr-10`}
              type={showConfirm ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('confirm')}
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
        <button className={btnPrimaryCls} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </AuthLayout>
  )
}
