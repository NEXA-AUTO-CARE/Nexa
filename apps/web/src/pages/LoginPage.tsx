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

const schema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(8),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    try {
      const user = await login(values)
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
    <AuthLayout
      title="Welcome back"
      footer={
        <>
          New to Nexa?{' '}
          <Link className="text-nexa-mint hover:underline" to="/signup">
            Create an account
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <Field label="Email or phone" error={errors.identifier?.message}>
          <input
            className={inputCls}
            autoComplete="username"
            {...register('identifier')}
          />
        </Field>
        <Field label="Password" error={errors.password?.message}>
          <div className="relative">
            <input
              className={`${inputCls} pr-10`}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
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
        <div className="flex justify-end -mt-2">
          <Link to="/forgot-password" className="text-sm text-nexa-mint hover:underline">
            Forgot Password?
          </Link>
        </div>
        {serverError && <p className="text-sm text-nexa-error">{serverError}</p>}
        <button className={btnPrimaryCls} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  )
}
