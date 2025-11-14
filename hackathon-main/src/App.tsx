import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import PDFUpload from './components/PDFUpload'
import LearningInterface from './components/LearningInterface'

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <PDFUpload />
            </Layout>
          }
        />
        <Route path="/learn" element={<LearningInterface />} />
      </Routes>
    </Router>
  )
}

export default App

