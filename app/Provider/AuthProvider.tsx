
'use client'
import { createContext, useActionState, useContext, useEffect, useState } from "react"
import { AuthContextType, Role, User } from "../types"
import { apiClient } from "../lib/apiclient"

const AuthContext = createContext<AuthContextType | undefined>(undefined)
function AuthProvider({ children }: { children: React.ReactNode }) {

  type LoginState = {
    success: boolean,
    user?: User | null,
    error?: string
  }

  const [user, setUser] = useState<User | null>(null);
  const [loginState, loginAction, isLoginPending] = useActionState(async (prevState: LoginState, formData: FormData): Promise<LoginState> => {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    try {
      const data = await apiClient.Login(email, password) as unknown as { user: User };
      setUser(data.user);
      return { success: true, user: data.user };
    } catch (e) {
      console.error("Login error:", e);
      return { success: false, error: (e as Error).message };
    }
  },
    {
      error: undefined, success: undefined, user: undefined
    } as unknown as LoginState);
  const logout = async () => {
    try {
      await apiClient.Logout();
      setUser(null);
      window.location.href = "/login";
    } catch (e) {
      console.error("Logout error:", e);
    }
  }

  const hasPermission = (requiredRole: Role): boolean => {
    if (!user) return false;
    const roleHierarchy = {
      [Role.GUEST]: 0,
      [Role.USER]: 1,
      [Role.MANAGER]: 2,
      [Role.ADMIN]: 3,
    };
    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }

  //Load User on Mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await apiClient.GetCurrentUser();
        setUser(data.user || null);
      } catch (e) {
        console.error("Failed to load user profile:", e);
      }
      loadUser();
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      login: loginAction,
      logout,
      hasPermission
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(`useAuth must be used within an AuthProvider`);
  }
  return context;
}

export default AuthProvider;