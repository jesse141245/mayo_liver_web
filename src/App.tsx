// Main App Component with Routing

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PipelineProvider } from './context/PipelineContext';
import { Home, Pipeline } from './pages';
import './index.css';

function App() {
  return (
    <PipelineProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pipeline" element={<Pipeline />} />
        </Routes>
      </Router>
    </PipelineProvider>
  );
}

export default App;
