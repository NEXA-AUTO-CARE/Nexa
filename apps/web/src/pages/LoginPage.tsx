import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
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
      await login(values)
      navigate('/garage', { replace: true })
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
          <Link className="text-brand-600 hover:underline" to="/signup">
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
          <input
            className={inputCls}
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
        </Field>
        {serverError && <p className="text-sm text-red-600">{serverError}</p>}
        <button className={btnPrimaryCls} type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Log in'}
        </button>
      </form>
    </AuthLayout>
  )
}
