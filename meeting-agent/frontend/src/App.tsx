import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Home from './pages/Home'
import MeetingReview from './pages/MeetingReview'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/meetings/:id" element={<MeetingReview />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
