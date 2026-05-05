import axios from 'axios'

export function describeError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const message = err.response?.data?.message
    if (Array.isArray(message)) return message.join(', ')
    if (typeof message === 'string') return message
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong'
}
