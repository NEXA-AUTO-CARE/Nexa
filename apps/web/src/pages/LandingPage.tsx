import { CTABanner } from '../components/landing/CTABanner'
import { FAQ } from '../components/landing/FAQ'
import { Footer } from '../components/landing/Footer'
import { HeroSection } from '../components/landing/HeroSection'
import { HowItWorks } from '../components/landing/HowItWorks'
import { Navbar } from '../components/landing/Navbar'
import { ServiceDetails } from '../components/landing/ServiceDetails'
import { WhyChooseNexa } from '../components/landing/WhyChooseNexa'

export function LandingPage() {
  return (
    <div className="nexa-bg-pattern min-h-full bg-nexa-bg">
      <Navbar />
      <main>
        <HeroSection />
        <HowItWorks />
        <ServiceDetails />
        <WhyChooseNexa />
        <FAQ />
        <CTABanner />
      </main>
      <Footer />
    </div>
  )
}
