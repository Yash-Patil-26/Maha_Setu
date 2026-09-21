const TOKEN_KEY = "setu_access_token"
const USER_KEY = "setu_auth_user"

export function getAuthUser() {
  const rawUser = localStorage.getItem(USER_KEY)
  return rawUser ? JSON.parse(rawUser) : null
}

export function setAuthSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY)
}
