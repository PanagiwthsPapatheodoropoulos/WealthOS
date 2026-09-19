import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useLogin } from '@/api/authApi'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values, { onSuccess: () => navigate('/') })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
      <div className="w-full max-w-sm">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-black text-xl shadow-lg shadow-blue-500/20 mb-3">
            W
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Sign in to WealthOS</h1>
          <p className="text-xs text-zinc-400 mt-1">Institutional portfolio & wealth management</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-900/70 p-7 shadow-2xl backdrop-blur-xl space-y-4">
          <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-zinc-300 mb-1.5">Work Email</label>
              <input
                id="email"
                type="email"
                placeholder="name@company.com"
                {...register('email')}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 transition-colors focus:border-blue-500 focus:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.email && <p className="mt-1 text-xs text-rose-400 font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-zinc-300">Password</label>
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 transition-colors focus:border-blue-500 focus:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              {errors.password && <p className="mt-1 text-xs text-rose-400 font-medium">{errors.password.message}</p>}
            </div>

            {login.isError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-300">
                Invalid credentials. Please check your email and password.
              </div>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/35 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {login.isPending ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="pt-4 border-t border-zinc-800/80 text-center">
            <p className="text-xs text-zinc-400">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}