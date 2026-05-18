import React from 'react'
import backgroundImage from '../assets/cta-abstract.jpg'

type PageBackgroundProps = {
  children: React.ReactNode
  className?: string
}

export function PageBackground({ children, className = '' }: PageBackgroundProps) {
  return (
    <div className={`relative min-h-screen bg-background text-foreground ${className}`.trim()}>
      <img
        src={backgroundImage}
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-20"
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
