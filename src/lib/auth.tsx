import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Role } from '@/types/database'

interface OrgMember {
  org_id: string
  role: Role
  org: { name: string }
}

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  orgId: string | null
  role: Role | null
  orgName: string | null
  signInWithOtp: (email: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  canEdit: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [orgMember, setOrgMember] = useState<OrgMember | null>(null)

  const loadOrgMember = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('org_members')
      .select('org_id, role, orgs(name)')
      .eq('user_id', userId)
      .limit(1)
      .single()
    const row = data as { org_id: string; role: Role; orgs: { name: string } } | null
    if (row?.orgs?.name) {
      setOrgMember({
        org_id: row.org_id,
        role: row.role,
        org: { name: row.orgs.name },
      })
    } else {
      setOrgMember(null)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) loadOrgMember(s.user.id)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
      if (s?.user) loadOrgMember(s.user.id)
      else setOrgMember(null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [loadOrgMember])

  const signInWithOtp = useCallback(async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    return { error: error ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const canEdit = !!orgMember && (orgMember.role === 'admin' || orgMember.role === 'broker')

  const value: AuthContextValue = {
    user,
    session,
    loading,
    orgId: orgMember?.org_id ?? null,
    role: orgMember?.role ?? null,
    orgName: orgMember?.org?.name ?? null,
    signInWithOtp,
    signOut,
    canEdit,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
