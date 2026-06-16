import { useEffect, useRef } from 'react'

interface UseIdleTimeoutOptions {
  timeoutMs: number
  onTimeout: () => void
  warningMs?: number
  onWarning?: () => void
  onActive?: () => void
}

export function useIdleTimeout({
  timeoutMs,
  onTimeout,
  warningMs = 60000,
  onWarning,
  onActive,
}: UseIdleTimeoutOptions) {
  const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleActivity = () => {
      // Clear existing timers
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)

      if (onActive) onActive()

      // Set warning timer (warn warningMs before total timeout)
      if (onWarning && timeoutMs > warningMs) {
        warningTimerRef.current = setTimeout(() => {
          onWarning()
        }, timeoutMs - warningMs)
      }

      // Set total timeout timer
      timeoutTimerRef.current = setTimeout(() => {
        onTimeout()
      }, timeoutMs)
    }

    // List of events to listen to
    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll']

    // Initialize timers
    handleActivity()

    // Add event listeners
    events.forEach((e) => window.addEventListener(e, handleActivity))

    return () => {
      // Clean up event listeners and timers
      events.forEach((e) => window.removeEventListener(e, handleActivity))
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current)
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    }
  }, [timeoutMs, warningMs, onTimeout, onWarning, onActive])
}
