import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerAdmin } from '../api/auth'
import {
  AuthButton,
  AuthError,
  AuthField,
  AuthLayout,
} from '../components/auth/AuthLayout'

export function SignupPage() {
  const navigate = useNavigate()
  const [organizationName, setOrganizationName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      // NOTE: registerAdmin's signature will need to be updated once the
      // backend changes land — passing organizationName in place of adminSecret.
      await registerAdmin(email, password, organizationName)
      setSuccess('Admin account created. You can sign in now.')
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
        <AuthError message={error} />
        {success && (
          <p className="mb-4 rounded-lg bg-accent-light px-3 py-2 font-ui text-sm text-accent-dark">
            {success}
          </p>
        )}
        <AuthField
          label="Organization name"
          type="text"
          value={organizationName}
          onChange={setOrganizationName}
          placeholder="Acme Inc."
        />
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
        <AuthButton isLoading={isLoading}>Create account</AuthButton>
      </form>
    </AuthLayout>
  )
}