import { Outlet } from 'react-router-dom'
import BackgroundGlow from './BackgroundGlow'
import Navbar from './Navbar'
import Footer from './Footer'

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#070812] text-white">
      <BackgroundGlow />
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
