import type { ReactNode } from 'react'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <div className="flex min-h-full items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="font-ui text-lg font-medium text-text-primary">
              NexaSupport
            </span>
          </div>
          <h1 className="font-ui text-2xl font-medium text-text-primary">{title}</h1>
          <p className="mt-2 font-ui text-sm text-text-secondary">{subtitle}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          {children}
        </div>

        {footer && (
          <div className="mt-6 text-center font-ui text-sm text-text-secondary">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

interface RoleToggleProps {
  value: 'user' | 'admin'
  onChange: (value: 'user' | 'admin') => void
}

export function RoleToggle({ value, onChange }: RoleToggleProps) {
  return (
    <div className="mb-5 flex rounded-lg border border-border bg-surface-muted p-1">
      <button
        type="button"
        onClick={() => onChange('user')}
        className={`flex-1 rounded-md py-2 font-ui text-sm transition-all duration-150 ${
          value === 'user'
            ? 'bg-surface text-accent shadow-sm'
            : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        User
      </button>
      <button
        type="button"
        onClick={() => onChange('admin')}
        className={`flex-1 rounded-md py-2 font-ui text-sm transition-all duration-150 ${
          value === 'admin'
            ? 'bg-surface text-accent shadow-sm'
            : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        Admin
      </button>
    </div>
  )
}

interface AuthFieldProps {
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

export function AuthField({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = true,
}: AuthFieldProps) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block font-ui text-xs font-medium text-text-secondary">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-11 w-full rounded-lg border border-border bg-surface px-3 font-ui text-sm text-text-primary outline-none transition-all duration-150 placeholder:text-text-hint focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </label>
  )
}

interface AuthButtonProps {
  children: ReactNode
  isLoading?: boolean
  variant?: 'primary' | 'secondary'
}

export function AuthButton({
  children,
  isLoading = false,
  variant = 'primary',
}: AuthButtonProps) {
  const base =
    'flex h-11 w-full items-center justify-center rounded-lg font-ui text-sm font-medium transition-all duration-150 disabled:opacity-60'
  const styles =
    variant === 'primary'
      ? 'bg-accent text-white hover:bg-accent-dark'
      : 'border border-border bg-surface text-text-secondary hover:bg-accent-light hover:text-accent'

  return (
    <button type="submit" disabled={isLoading} className={`${base} ${styles}`}>
      {isLoading ? 'Please wait…' : children}
    </button>
  )
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null
  return (
    <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 font-ui text-sm text-red-600">
      {message}
    </p>
  )
}
