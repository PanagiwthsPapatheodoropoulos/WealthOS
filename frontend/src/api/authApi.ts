import { useMutation } from '@tanstack/react-query'
import { http } from '@/lib/http'
import { useAuthStore } from '@/stores/authStore'
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types/auth'

function login(payload: LoginRequest) {
  return http.post<AuthResponse>('/auth/login', payload, { skipAuth: true })
}

function registerUser(payload: RegisterRequest) {
  return http.post<AuthResponse>('/auth/register', payload, { skipAuth: true })
}

function logoutRequest() {
  return http.post<void>('/auth/logout')
}

export function useLogin() {
  const setSession = useAuthStore((s) => s.setSession)

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => setSession(data.accessToken, data.refreshToken, data.user),
  })
}

export function useRegister() {
  const setSession = useAuthStore((s) => s.setSession)

  return useMutation({
    mutationFn: registerUser,
    onSuccess: (data) => setSession(data.accessToken, data.refreshToken, data.user),
  })
}

export function useLogout() {
  const clearSession = useAuthStore((s) => s.clearSession)

  return useMutation({
    mutationFn: logoutRequest,
    onSettled: () => clearSession(),
  })
}