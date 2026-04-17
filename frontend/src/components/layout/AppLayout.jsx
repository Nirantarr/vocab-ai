import { Outlet } from 'react-router-dom'
import BackgroundGlow from './BackgroundGlow'
import Navbar from './Navbar'
import Footer from './Footer'

export default function AppLayout() {
  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: "var(--page-bg)", color: "var(--text-primary)" }}
    >
      <BackgroundGlow />
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
