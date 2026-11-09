import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { demoData } from '../data/demo'
import type { SchoolData } from '../types'
import { fetchAll, login as edLogin, answerQcm, setHomeworkDone, type DeviceTrust, type Qcm, type Session } from '../api/ecoledirecte'
import { isAuthError } from '../api/client'

const SESSION_KEY = 'edo:session'
const TRUST_KEY = 'edo:trust'
const DEMO_KEY = 'edo:demo-homework'

type Status = 'signed-out' | 'loading' | 'ready'

interface PendingQcm {
  identifiant: string
  motdepasse: string
  remember: boolean
  token: string
  qcm: Qcm
}

interface Ctx {
  status: Status
  mode: 'demo' | 'live' | null
  data: SchoolData | null
  error: string | null
  pendingQcm: PendingQcm | null
  refreshing: boolean
  signIn: (identifiant: string, motdepasse: string, remember: boolean) => Promise<void>
  submitQcm: (choice: string) => Promise<void>
  cancelQcm: () => void
  startDemo: () => void
  signOut: () => void
  refresh: () => Promise<void>
  toggleHomework: (id: string) => void
}

const SessionContext = createContext<Ctx | null>(null)

// --- stockage (toujours protégé : navigation privée, stockage bloqué…) -------
const store = {
  get<T>(key: string, where: Storage = localStorage): T | null {
    try { const v = where.getItem(key); return v ? (JSON.parse(v) as T) : null } catch { return null }
  },
  set(key: string, value: unknown, where: Storage = localStorage) {
    try { where.setItem(key, JSON.stringify(value)) } catch { /* ignoré */ }
  },
  del(key: string) {
    try { localStorage.removeItem(key); sessionStorage.removeItem(key) } catch { /* ignoré */ }
  },
}

type Saved = { session: Session; remember: boolean } | { demo: true }

function loadSaved(): Saved | null {
  return store.get<Saved>(SESSION_KEY) ?? store.get<Saved>(SESSION_KEY, sessionStorage)
}

function saveSession(session: Session, remember: boolean) {
  store.del(SESSION_KEY)
  store.set(SESSION_KEY, { session, remember }, remember ? localStorage : sessionStorage)
}

const trustKey = (id: string) => id.trim().toLowerCase()

export function SessionProvider({ children }: { children: ReactNode }) {
  const saved = useRef(loadSaved()).current
  const [mode, setMode] = useState<Ctx['mode']>(saved ? ('demo' in saved ? 'demo' : 'live') : null)
  const [data, setData] = useState<SchoolData | null>(null)
  const [status, setStatus] = useState<Status>(saved ? 'loading' : 'signed-out')
  const [error, setError] = useState<string | null>(null)
  const [pendingQcm, setPendingQcm] = useState<PendingQcm | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const session = useRef<{ session: Session; remember: boolean } | null>(saved && 'session' in saved ? saved : null)

  const signOut = useCallback(() => {
    store.del(SESSION_KEY)
    session.current = null
    setMode(null)
    setData(null)
    setPendingQcm(null)
    setStatus('signed-out')
  }, [])

  const load = useCallback(async () => {
    const s = session.current
    if (!s) return
    try {
      const { data, token } = await fetchAll(s.session)
      s.session = { ...s.session, token }
      saveSession(s.session, s.remember)
      setData(data)
      setError(null)
      setStatus('ready')
    } catch (e) {
      if (isAuthError(e)) {
        signOut()
        setError('Ta session a expiré, reconnecte-toi.')
      } else {
        setError(e instanceof Error ? e.message : String(e))
        // Rien d'affiché encore : retour à l'écran de connexion (la session reste enregistrée).
        if (!data) {
          setMode(null)
          setStatus('signed-out')
        }
      }
    }
  }, [signOut, data])

  // Au démarrage : on reprend la session enregistrée.
  useEffect(() => {
    if (!saved) return
    if ('demo' in saved) {
      setData({ ...demoData, homework: store.get(DEMO_KEY) ?? demoData.homework })
      setStatus('ready')
    } else void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const finishLogin = useCallback(async (s: Session, remember: boolean) => {
    session.current = { session: s, remember }
    saveSession(s, remember)
    setMode('live')
    setPendingQcm(null)
    setStatus('loading')
    await load()
  }, [load])

  const signIn = useCallback(async (identifiant: string, motdepasse: string, remember: boolean) => {
    setError(null)
    try {
      const trust = store.get<Record<string, DeviceTrust>>(TRUST_KEY)?.[trustKey(identifiant)]
      const r = await edLogin(identifiant, motdepasse, trust)
      if (r.kind === 'qcm') setPendingQcm({ identifiant, motdepasse, remember, token: r.token, qcm: r.qcm })
      else await finishLogin(r.session, remember)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [finishLogin])

  const submitQcm = useCallback(async (choice: string) => {
    const p = pendingQcm
    if (!p) return
    setError(null)
    try {
      const trust = await answerQcm(p.token, choice)
      // cn/cv sont réutilisables : on les garde pour éviter le QCM la prochaine fois.
      if (p.remember) store.set(TRUST_KEY, { ...store.get<Record<string, DeviceTrust>>(TRUST_KEY), [trustKey(p.identifiant)]: trust })
      const r = await edLogin(p.identifiant, p.motdepasse, trust)
      if (r.kind === 'qcm') setPendingQcm({ ...p, token: r.token, qcm: r.qcm })
      else await finishLogin(r.session, p.remember)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [pendingQcm, finishLogin])

  const startDemo = useCallback(() => {
    store.set(SESSION_KEY, { demo: true })
    setMode('demo')
    setData({ ...demoData, homework: store.get(DEMO_KEY) ?? demoData.homework })
    setError(null)
    setStatus('ready')
  }, [])

  const refresh = useCallback(async () => {
    if (mode === 'demo') {
      store.del(DEMO_KEY)
      setData(demoData)
      return
    }
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [mode, load])

  const toggleHomework = useCallback((id: string) => {
    setData((d) => {
      if (!d) return d
      const hw = d.homework.find((h) => h.id === id)
      if (!hw) return d
      const homework = d.homework.map((h) => (h.id === id ? { ...h, done: !h.done } : h))
      if (mode === 'demo') store.set(DEMO_KEY, homework)
      else if (session.current) {
        setHomeworkDone(session.current.session, id, !hw.done).catch((e) => {
          setError(`Impossible d’enregistrer sur École Directe : ${e instanceof Error ? e.message : e}`)
          setData((d2) => d2 && { ...d2, homework: d2.homework.map((h) => (h.id === id ? { ...h, done: hw.done } : h)) })
        })
      }
      return { ...d, homework }
    })
  }, [mode])

  const value = useMemo<Ctx>(() => ({
    status, mode, data, error, pendingQcm, refreshing,
    signIn, submitQcm, cancelQcm: () => setPendingQcm(null), startDemo, signOut, refresh, toggleHomework,
  }), [status, mode, data, error, pendingQcm, refreshing, signIn, submitQcm, startDemo, signOut, refresh, toggleHomework])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession doit être utilisé dans <SessionProvider>')
  return ctx
}

/** Pour les pages affichées une fois connecté : les données sont forcément là. */
export function useData() {
  const { data } = useSession()
  if (!data) throw new Error('Données non chargées')
  return data
}
