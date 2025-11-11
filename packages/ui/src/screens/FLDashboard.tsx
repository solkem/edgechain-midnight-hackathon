import { useNavigate, Navigate } from 'react-router-dom';
import useEdgeChain from '../context/useEdgeChain';
import { useWallet } from '../providers/WalletProvider';
import type { Wallet, Farmer, Submission } from '../types/app';

/**
 * Train Route Component - Federated Learning Dashboard
 */
export function TrainRoute() {
  const { farmer, wallet, round, version, submissions, submitUpdate, disconnect } = useEdgeChain();
  const { disconnectWallet } = useWallet();
  const navigate = useNavigate();

  if (!farmer || !wallet) {
    return <Navigate to="/" replace />;
  }

  return (
    <FLDashboard
      farmer={farmer}
      wallet={wallet}
      round={round}
      version={version}
      submissions={submissions}
      onSubmit={submitUpdate}
      onAggregation={() => navigate('/aggregation')}
      onAI={() => navigate('/predictions')}
      onDisconnect={() => {
        disconnect();
        disconnectWallet();
        navigate('/');
      }}
    />
  );
}

export default function FLDashboard({ farmer, wallet, round, version, submissions, onSubmit, onAggregation, onAI, onDisconnect }: { farmer: Farmer; wallet: Wallet; round: number; version: number; submissions: Submission[]; onSubmit: () => void; onAggregation: () => void; onAI: () => void; onDisconnect: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900">
      <div className="bg-slate-900/80 border-b border-purple-500/20 p-4">
        <div className="max-w-6xl mx-auto flex justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Welcome, {farmer.name}</h1>
            <p className="text-sm text-purple-300">{farmer.region}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onAI} className="px-4 py-2 bg-green-600/20 text-green-300 rounded-lg hover:bg-green-600/30 transition-all text-sm">AI Predictions</button>
            <button onClick={onDisconnect} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-all">Disconnect</button>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800/60 border border-purple-500/20 rounded-xl p-6">
            <p className="text-sm text-purple-300 mb-2">Current Round</p>
            <p className="text-4xl font-bold text-purple-400">{round}</p>
          </div>
          <div className="bg-slate-800/60 border border-purple-500/20 rounded-xl p-6">
            <p className="text-sm text-purple-300 mb-2">Model Version</p>
            <p className="text-4xl font-bold text-blue-400">v{version}</p>
          </div>
          <div className="bg-slate-800/60 border border-purple-500/20 rounded-xl p-6">
            <p className="text-sm text-purple-300 mb-2">Member Since</p>
            <p className="text-2xl font-bold text-white">{farmer.joinedAt.toLocaleDateString()}</p>
          </div>
        </div>
        <div className="bg-slate-800/60 border border-purple-500/20 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-green-500">✓</span>
            <h3 className="text-lg font-semibold text-white">Wallet Connected</h3>
          </div>
          <div className="bg-slate-900/60 rounded-lg p-4">
            <p className="text-xs text-purple-300 mb-1">Lace Address</p>
            <p className="text-sm text-white font-mono break-all">{wallet.address}</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 rounded-xl transition-all">📥 Download Model</button>
          <button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 rounded-xl transition-all">⚙️ Train Model</button>
          <button onClick={onSubmit} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 rounded-xl transition-all">📤 Submit Update</button>
          <button onClick={onAggregation} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-4 rounded-xl transition-all">📊 View Aggregation</button>
        </div>
        {submissions.length > 0 && (
          <div className="mt-6 bg-slate-800/60 border border-purple-500/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Your Submissions</h3>
            {submissions.slice(-3).reverse().map(s => (
              <div key={s.id} className="bg-slate-900/60 rounded-lg p-4 mb-2 flex justify-between items-center">
                <div>
                  <p className="text-sm text-white font-mono">{s.proof}</p>
                  <p className="text-xs text-purple-300 mt-1">{s.time.toLocaleString()}</p>
                </div>
                <span className="text-green-500">✓</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

