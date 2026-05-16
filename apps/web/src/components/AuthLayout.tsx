import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from './ui/Logo'

interface Props {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: Props) {
  return (
    <div className="nexa-bg-pattern flex min-h-full flex-col bg-nexa-bg">
      {/* Mini navbar */}
      <nav className="px-6 py-4">
        <Logo />
      </nav>

      {/* Auth card */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-nexa-border-card bg-nexa-bg-card-solid p-8 shadow-card animate-fade-in-up">
          <div>
            <h1 className="text-2xl font-semibold text-white">{title}</h1>
            {subtitle && (
              <p className="mt-1 text-sm text-nexa-text-secondary">{subtitle}</p>
            )}
          </div>
          {children}
          {footer && (
            <div className="text-center text-sm text-nexa-text-secondary">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
