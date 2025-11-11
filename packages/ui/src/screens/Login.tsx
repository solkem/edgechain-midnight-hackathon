import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../providers/WalletProvider';
import useEdgeChain from '../context/useEdgeChain';

/**
 * Login Route Component - Handles wallet connection and navigation
 */
export function LoginRoute() {
  const { setWallet, setFarmer } = useEdgeChain();
  const navigate = useNavigate();

  /**
   * Use the real Midnight wallet from WalletProvider instead of mock
   * This gives us:
   * - Real Lace Midnight Preview wallet connection
   * - Wallet installation detection
   * - Actual Midnight wallet address from extension
   * - Connection to Midnight devnet with tDUST tokens
   */
  const walletContext = useWallet();
  const {
    isConnected,
    address,
    isMidnightPreviewInstalled,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
  } = walletContext;

  /**
   * When wallet connects successfully, update AppContext
   * and navigate to registration or selection
   */
  useEffect(() => {
    if (isConnected && address) {
      // Update the app's wallet state
      setWallet({ address });

      // Check if farmer profile exists
      const saved = localStorage.getItem(`farmer_${address}`);
      if (saved) {
        const parsedFarmer = JSON.parse(saved);
        parsedFarmer.joinedAt = new Date(parsedFarmer.joinedAt);
        setFarmer(parsedFarmer);
        navigate('/selection');
      } else {
        navigate('/register');
      }
    }
  }, [isConnected, address]);

  /**
   * Pass Midnight wallet state and real connect function to Login component
   */
  return (
    <Login
      onConnect={connectWallet}
      isConnecting={isConnecting}
      isMidnightPreviewInstalled={isMidnightPreviewInstalled}
      error={error}
    />
  );
}

/**
 * Login Component - Now with real Lace Midnight Preview wallet integration!
 *
 * Props:
 * - onConnect: Function to connect Lace Midnight Preview wallet
 * - isConnecting: Are we currently connecting to Midnight devnet?
 * - isMidnightPreviewInstalled: Is Lace Midnight Preview extension installed?
 * - error: Any error message to display
 *
 * IMPORTANT: This connects to Midnight devnet with tDUST tokens, not Cardano!
 */
export default function Login({
  onConnect,
  isConnecting = false,
  isMidnightPreviewInstalled = true,
  error = null,
}: {
  onConnect: () => void;
  isConnecting?: boolean;
  isMidnightPreviewInstalled?: boolean;
  error?: string | null;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-600/40 rounded-full mb-6">
            <span className="text-5xl">🌾</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-3">EdgeChain</h1>
          <p className="text-purple-200 text-lg">Federated Learning for Farmers</p>
          <p className="text-purple-300 text-sm mt-2">Powered by Midnight ZK-Proofs</p>
        </div>

        <div className="bg-slate-800/60 backdrop-blur-md border border-purple-500/30 rounded-2xl p-8">
          {/* Show error message if connection failed */}
          {error && (
            <div className="mb-4 p-4 bg-red-900/50 border border-red-500/50 rounded-lg">
              <p className="text-red-200 text-sm">⚠️ {error}</p>
            </div>
          )}

          {/* Show "Install Midnight Preview" button if not installed */}
          {!isMidnightPreviewInstalled ? (
            <div className="mb-6">
              <div className="mb-4 p-4 bg-yellow-900/50 border border-yellow-500/50 rounded-lg">
                <p className="text-yellow-200 text-sm mb-2">
                  ⚠️ Lace Midnight Preview is not installed
                </p>
                <p className="text-yellow-100 text-xs mb-2">
                  You need the Lace Midnight Preview extension for Midnight devnet.
                </p>
                <p className="text-yellow-100 text-xs">
                  This is a specialized extension for privacy-preserving DApps with tDUST tokens.
                </p>
              </div>
              <a
                href="https://docs.midnight.network/"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold py-4 px-6 rounded-xl text-center transition-all"
              >
                Install Lace Midnight Preview →
              </a>
            </div>
          ) : (
            /* Show connect button if Midnight Preview is installed */
            <button
              onClick={onConnect}
              disabled={isConnecting}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-xl mb-8 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Connecting to Midnight...
                </span>
              ) : (
                'Connect Midnight Preview'
              )}
            </button>
          )}

          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-white font-semibold mb-4">What is EdgeChain?</h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li>✓ Get AI crop predictions via SMS ($0.10 each)</li>
              <li>✓ Vote on accuracy, improve models collectively</li>
              <li>✓ Earn tokens for participation</li>
              <li>✓ Private data with zero-knowledge proofs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

