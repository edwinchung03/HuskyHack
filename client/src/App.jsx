import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Editor from './pages/Editor';
import Decisions from './pages/Decisions';
import DecisionEditor from './pages/DecisionEditor';
import MoodDashboard from './pages/MoodDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor/:date" element={<Editor />} />
        <Route path="/decisions" element={<Decisions />} />
        <Route path="/decisions/new" element={<DecisionEditor />} />
        <Route path="/decisions/:id" element={<DecisionEditor />} />
        <Route path="/mood" element={<MoodDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
