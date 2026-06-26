import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerAdmin, registerUser } from '../api/auth'
import {
  AuthButton,
  AuthError,
  AuthField,
  AuthLayout,
  RoleToggle,
} from '../components/auth/AuthLayout'

export function SignupPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminSecret, setAdminSecret] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      if (role === 'admin') {
        await registerAdmin(email, password, adminSecret)
        setSuccess('Admin account created. You can sign in now.')
      } else {
        await registerUser(email, password)
        setSuccess('Registration successful. Check your email to confirm, then sign in.')
      }
      setTimeout(() => navigate('/login', { replace: true }), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Join NexaSupport to get started"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:text-accent-dark">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <RoleToggle value={role} onChange={setRole} />
        <AuthError message={error} />
        {success && (
          <p className="mb-4 rounded-lg bg-accent-light px-3 py-2 font-ui text-sm text-accent-dark">
            {success}
          </p>
        )}
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
          placeholder="Create a password"
        />
        {role === 'admin' && (
          <AuthField
            label="Admin secret code"
            type="password"
            value={adminSecret}
            onChange={setAdminSecret}
            placeholder="Enter admin registration secret"
          />
        )}
        <AuthButton isLoading={isLoading}>Create account</AuthButton>
      </form>
    </AuthLayout>
  )
}
