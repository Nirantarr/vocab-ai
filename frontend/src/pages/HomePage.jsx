import HeroSection from '../components/home/HeroSection'
import StatsBar from '../components/home/StatsBar'
import TextAnalyzer from '../components/home/TextAnalyzer'
import FeaturesSection from '../components/home/FeaturesSection'
import HowItWorksSection from '../components/home/HowItWorksSection'

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsBar />
      <TextAnalyzer />
      <FeaturesSection />
      <HowItWorksSection />
    </>
  )
}
