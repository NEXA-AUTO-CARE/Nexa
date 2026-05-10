import { FacebookIcon, InstagramIcon, LinkedInIcon } from './icons'

const socialLinks = [
  { icon: LinkedInIcon, href: '#', label: 'LinkedIn' },
  { icon: InstagramIcon, href: '#', label: 'Instagram' },
  { icon: FacebookIcon, href: '#', label: 'Facebook' },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-nexa-border-subtle px-6 py-10">
      <div className="mx-auto max-w-7xl">
        {/* Social Icons */}
        <div className="flex items-center justify-center gap-6">
          {socialLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              aria-label={link.label}
              className="text-nexa-text-muted transition-colors hover:text-nexa-mint"
              target="_blank"
              rel="noopener noreferrer"
            >
              <link.icon size={22} />
            </a>
          ))}
        </div>

        {/* Copyright */}
        <p className="mt-6 text-center text-sm text-nexa-text-muted">
          © {year} NEXA. All rights reserved. Aberdeen, Scotland.
        </p>
      </div>
    </footer>
  )
}
