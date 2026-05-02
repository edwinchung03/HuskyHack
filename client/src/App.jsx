import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Editor from './pages/Editor';
import MoodDashboard from './pages/MoodDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"             element={<Home />} />
        <Route path="/editor/:date" element={<Editor />} />
        <Route path="/mood"         element={<MoodDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
