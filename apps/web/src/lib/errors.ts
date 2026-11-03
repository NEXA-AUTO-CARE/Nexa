import axios from 'axios'

export function describeError(
  err: unknown,
  fallback = 'Something went wrong',
): string {
  if (axios.isAxiosError(err)) {
    const message = err.response?.data?.message
    if (Array.isArray(message)) return message.join(', ')
    if (typeof message === 'string') return message
    return err.message || fallback
  }
  if (err instanceof Error) return err.message || fallback
  return fallback
}
