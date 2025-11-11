import { useNavigate, Navigate } from 'react-router-dom';
import useEdgeChain from '../context/useEdgeChain';
import { useWallet } from '../providers/WalletProvider';
import type { Farmer } from '../types/app';

/**
 * Selection Route Component - Choose between FL Training or AI Predictions
 */
export function SelectionRoute() {
  const { farmer, disconnect } = useEdgeChain();
  const { disconnectWallet } = useWallet();
  const navigate = useNavigate();

  if (!farmer) {
    return <Navigate to="/" replace />;
  }

  return (
    <Selection
      farmer={farmer}
      onFL={() => navigate('/train')}
      onAI={() => navigate('/predictions')}
      onDisconnect={() => {
        disconnect();
        disconnectWallet();
        navigate('/');
      }}
    />
  );
}

export default function Selection({ farmer, onFL, onAI, onDisconnect }: { farmer: Farmer; onFL: () => void; onAI: () => void; onDisconnect: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8 pt-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome, {farmer.name}</h1>
            <p className="text-purple-200 text-sm">{farmer.region}</p>
          </div>
          <button onClick={onDisconnect} className="px-4 py-2 bg-slate-800/60 text-white rounded-lg hover:bg-slate-800 transition-all">Disconnect</button>
        </div>
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-white mb-3">What would you like to do today?</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <button onClick={onFL} className="bg-slate-800/60 border-2 border-purple-500/30 hover:border-purple-500 rounded-2xl p-8 text-left transition-all transform hover:scale-105">
            <div className="w-16 h-16 bg-purple-600/40 rounded-full mb-4 flex items-center justify-center text-4xl">⚙️</div>
            <h3 className="text-2xl font-bold text-white mb-2">FL Training</h3>
            <p className="text-purple-200 text-sm">Download models, train locally, submit updates with ZK-proofs</p>
          </button>
          <button onClick={onAI} className="bg-slate-800/60 border-2 border-green-500/30 hover:border-green-500 rounded-2xl p-8 text-left transition-all transform hover:scale-105">
            <div className="w-16 h-16 bg-green-600/40 rounded-full mb-4 flex items-center justify-center text-4xl">🌾</div>
            <h3 className="text-2xl font-bold text-white mb-2">AI Predictions</h3>
            <p className="text-purple-200 text-sm">Get SMS predictions, vote on accuracy, track your impact</p>
          </button>
        </div>
      </div>
    </div>
  );
}

