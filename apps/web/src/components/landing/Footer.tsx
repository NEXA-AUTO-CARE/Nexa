import { FacebookIcon, InstagramIcon, LinkedInIcon, TikTokIcon } from './icons'

const socialLinks = [
  {
    icon: LinkedInIcon,
    href: 'https://www.linkedin.com/company/nexa-autocare/',
    label: 'LinkedIn',
  },
  {
    icon: InstagramIcon,
    href: 'https://www.instagram.com/invites/contact/?igsh=1fhgsrzweu0dq&utm_content=4d7kaws',
    label: 'Instagram',
  },
  {
    icon: FacebookIcon,
    href: 'https://www.facebook.com/share/18aQ5XRd2s/?mibextid=wwXIfr',
    label: 'Facebook',
  },
  {
    icon: TikTokIcon,
    href: 'https://www.tiktok.com/@nexahq_?_r=1&_t=ZN-96RQzgOqt9i',
    label: 'TikTok',
  },
]

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-nexa-border-subtle px-6 py-10">
      <div className="mx-auto max-w-7xl text-center space-y-4">
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

        {/* Company Details */}
        <div className="space-y-1 text-xs text-nexa-text-muted">
          <p className="font-medium text-nexa-text-secondary">
            NEXA Autocare Technologies Ltd (Company No. SC886916)
          </p>
          <p>
            One Tech Hub, Schoolhill, Aberdeen, AB10 1JQ, Scotland ·{' '}
            <a href="mailto:hello@nexaautocare.com" className="hover:text-nexa-mint underline-offset-2 hover:underline">
              hello@nexaautocare.com
            </a>
          </p>
        </div>

        {/* Copyright */}
        <p className="text-xs text-nexa-text-muted">
          © {year} NEXA Autocare Technologies Ltd. All rights reserved. Aberdeen, Scotland.
        </p>
      </div>
    </footer>
  )
}
