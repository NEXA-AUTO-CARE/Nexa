import React, { createContext, useContext, useEffect, useState } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'

interface NetworkStatusContextType {
  isOnline: boolean
  hasNetworkError: boolean
  errorMessage: string | null
  clearNetworkError: () => void
}

const NetworkStatusContext = createContext<NetworkStatusContextType | undefined>(undefined)

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [hasNetworkError, setHasNetworkError] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setHasNetworkError(false)
      setErrorMessage(null)
    }
    const handleOffline = () => {
      setIsOnline(false)
    }
    const handleNetworkError = (e: Event) => {
      const customEvent = e as CustomEvent<string>
      setHasNetworkError(true)
      setErrorMessage(customEvent.detail || 'Network request failed')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('nexa-network-error', handleNetworkError)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('nexa-network-error', handleNetworkError)
    }
  }, [])

  const clearNetworkError = () => {
    setHasNetworkError(false)
    setErrorMessage(null)
  }

  const handleRetry = () => {
    if (navigator.onLine) {
      setIsOnline(true)
      clearNetworkError()
    }
  }

  const showBanner = !isOnline || hasNetworkError

  return (
    <NetworkStatusContext.Provider value={{ isOnline, hasNetworkError, errorMessage, clearNetworkError }}>
      {children}
      {showBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-fade-in">
          <div className="glass-card p-4 border border-destructive/30 shadow-2xl relative overflow-hidden bg-card/90 backdrop-blur-md">
            {/* Left red indicator bar */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive" />
            <div className="flex items-start gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg text-destructive shrink-0">
                <WifiOff className="w-5 h-5 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-display font-semibold text-sm text-foreground">
                  {!isOnline ? 'Connection Lost' : 'Network Failure'}
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {!isOnline
                    ? 'You are currently offline. Please check your internet connection.'
                    : errorMessage || 'Unable to reach the Nexa servers. Please try again.'}
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Connection</span>
                  </button>
                  {hasNetworkError && (
                    <button
                      onClick={clearNetworkError}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </NetworkStatusContext.Provider>
  )
}

export function useNetworkStatus() {
  const context = useContext(NetworkStatusContext)
  if (!context) {
    throw new Error('useNetworkStatus must be used within a NetworkStatusProvider')
  }
  return context
}
