import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser } from '../api/auth'
import {
  AuthButton,
  AuthError,
  AuthField,
  AuthLayout,
} from '../components/auth/AuthLayout'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const user = await loginUser(email, password)
      setUser(user)
      navigate(user.role === 'admin' ? '/admin' : '/chats', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to NexaSupport"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/signup" className="text-accent hover:text-accent-dark">
            Sign up
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <AuthError message={error} />
        <AuthField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@company.com"
        />
        <AuthField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
        />
        <AuthButton isLoading={isLoading}>Sign in</AuthButton>
      </form>
    </AuthLayout>
  )
}
