import { Link } from 'react-router-dom'
import nexaLogo from '../../assets/nexa-logo.png'

interface LogoProps {
  className?: string
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <Link to="/" className={`flex items-center ${className}`.trim()}>
      <img src={nexaLogo} alt="Nexa Logo" className="h-8 w-auto" />
    </Link>
  )
}
