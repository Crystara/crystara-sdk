'use client'

import { useEffect, useState } from 'react'
import { Loader2, Wallet, LogOut } from 'lucide-react'
import useStarkeyWallet from '@/app/hooks/starkeyExampleHook'

// Define global window type for the wallet
declare global {
  interface Window {
    starKeyWallet?: any;
  }
}

export default function SimpleNavbar() {
  const [loading, setLoading] = useState(false)
  
  // Use the existing hook for compatibility
  const starKeyWalletHook = useStarkeyWallet()
  
  // Check if extension is installed
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false)
  
  useEffect(() => {
    // Check if extension is installed
    if (typeof window !== 'undefined' && window.starKeyWallet) {
      setIsExtensionInstalled(true)
    }
  }, [])

  // Connect wallet using the hook
  const connectWallet = async () => {
    setLoading(true)
    try {
      await starKeyWalletHook.connectWallet()
    } catch (error) {
      console.error("Failed to connect wallet:", error)
    } finally {
      setLoading(false)
    }
  }

  // Disconnect wallet using the hook - FIXED
  const disconnectWallet = async () => {
    setLoading(true)
    try {
      // This is the key part - using the original disconnect method
      await starKeyWalletHook.disconnectWallet()
    } catch (error) {
      console.error("Failed to disconnect wallet:", error)
    } finally {
      setLoading(false)
    }
  }

  // Format address for display
  const formatAddress = (address: string) => {
    if (!address) return ''
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  // Check if wallet is connected
  const isConnected = starKeyWalletHook.accounts && starKeyWalletHook.accounts.length > 0
  const walletAddress = isConnected ? starKeyWalletHook.accounts[0] : null

  return (
    <nav className="fixed w-full z-50 bg-gray-900 bg-opacity-90 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <a href="/" className="flex items-center">
              <span className="text-xl font-bold text-white">Crystara Blind Box SDK</span>
            </a>
          </div>
          
          <div>
            {!isConnected ? (
              <button
                onClick={connectWallet}
                disabled={loading}
                className="flex items-center justify-center px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wallet className="mr-2 h-4 w-4" />
                )}
                Connect Wallet
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <div className="bg-gray-800 px-3 py-1 rounded-md text-gray-300 text-sm">
                  {formatAddress(walletAddress || '')}
                </div>
                
                <button
                  onClick={disconnectWallet}
                  disabled={loading}
                  className="flex items-center justify-center px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}