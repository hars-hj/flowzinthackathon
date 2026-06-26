import { useNavigate } from 'react-router-dom'
import VideoBackground from './VideoBackground'
import Navbar from './Navbar'
import Hero from './Hero'
import WhyNexa from './WhyNexa'
import RAG from './RAG'
import Deploy from './Deploy'
import CTA from './CTA'
import Footer from './Footer'

export default function LandingPage() {
  const navigate = useNavigate()

  const goToChat = () => navigate('/chat')

  return (
    <>
      <VideoBackground />
      <div className="relative z-10">
        <Navbar onStartFree={goToChat} />
        <Hero onStartFree={goToChat} />
        <WhyNexa />
        <RAG onSeePipeline={goToChat} />
        <Deploy />
        <CTA onStartTrial={goToChat} onBookDemo={goToChat} />
        <Footer />
      </div>
    </>
  )
}