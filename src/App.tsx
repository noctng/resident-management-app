import { Routes, Route } from 'react-router-dom';
import AdminHost from './components/AdminHost';
import ResidentPortalHost from './components/ResidentPortalHost';
import '@n8n/chat/style.css';

function App() {
  return (
    <Routes>
      <Route path="/*" element={<ResidentPortalHost />} />
      <Route path="/admin/*" element={<AdminHost />} />
    </Routes>
  );
}

export default App;
