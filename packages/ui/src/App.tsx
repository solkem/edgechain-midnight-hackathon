import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './screens/home';
import { RegisterRoute } from './screens/Register';
import { SelectionRoute } from './screens/Selection';
import { TrainRoute } from './screens/FLDashboard';
import { AggregationRoute } from './screens/Aggregation';
import { PredictionsRoute } from './screens/AIDashboard';
import Navbar from './components/Navbar';
import './App.css'
import { EdgeChainProvider } from './context/useEdgeChain';


export default function App() {

  return (
    <EdgeChainProvider>
      <BrowserRouter>
        <Navbar/>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<RegisterRoute />} />
          <Route path="/selection" element={<SelectionRoute />} />
          <Route path="/train" element={<TrainRoute />} />
          <Route path="/aggregation" element={<AggregationRoute />} />
          <Route path="/predictions" element={<PredictionsRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </EdgeChainProvider>
  );
}
