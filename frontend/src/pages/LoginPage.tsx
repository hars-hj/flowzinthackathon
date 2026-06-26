import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loginUser } from '../api/auth'
import {
  AuthButton,
  AuthError,
  AuthField,
  AuthLayout,
  RoleToggle,
} from '../components/auth/AuthLayout'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminSecret, setAdminSecret] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const user = await loginUser(
        email,
        password,
        role,
        role === 'admin' ? adminSecret : undefined,
      )
      setUser(user)
      navigate(role === 'admin' ? '/admin' : '/', { replace: true })
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
        <RoleToggle value={role} onChange={setRole} />
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
        {role === 'admin' && (
          <AuthField
            label="Admin secret code"
            type="password"
            value={adminSecret}
            onChange={setAdminSecret}
            placeholder="Enter admin secret"
          />
        )}
        <AuthButton isLoading={isLoading}>Sign in</AuthButton>
      </form>
    </AuthLayout>
  )
}
