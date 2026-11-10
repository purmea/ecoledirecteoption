import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { demoData, demoMessageDetails } from '../data/demo'
import type { Lesson, MessageDetail, SchoolData } from '../types'
import { displayedMonday, fetchAll, fetchLessonsFor, fetchMessageDetail, isoDate, login as edLogin, answerQcm, setHomeworkDone, type DeviceTrust, type Qcm, type Session } from '../api/ecoledirecte'
import { isAuthError } from '../api/client'

const SESSION_KEY = 'edo:session'
const TRUST_KEY = 'edo:trust'
const DEMO_KEY = 'edo:demo-homework'
const CACHE_KEY = 'edo:cache'

type Status = 'signed-out' | 'loading' | 'ready'

interface PendingQcm {
  identifiant: string
  motdepasse: string
  remember: boolean
  token: string
  twoFa?: string
  qcm: Qcm
}

interface Ctx {
  status: Status
  mode: 'demo' | 'live' | null
  data: SchoolData | null
  error: string | null
  pendingQcm: PendingQcm | null
  refreshing: boolean
  /** Date des données affichées (cache ou dernier chargement). */
  updatedAt: number | null
  /** Lundi (ISO) de la semaine affichée par défaut + décalage en semaines. */
  loadWeek: (offset: number) => Promise<{ lessons: Lesson[]; monday: string }>
  /** Ouvre un message (le marque comme lu, ici et sur École Directe). */
  openMessage: (id: string) => Promise<MessageDetail>
  messageMeta: MessageMeta
  /** Épingler, archiver, supprimer (masquer) ou remettre en non lu un message. */
  messageAction: (id: string, action: MessageAction) => void
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
type Cache = { data: SchoolData; at: number }

/** Organisation des messages, gardée sur cet appareil (épinglés, archivés, masqués, remis en « non lu »). */
export interface MessageMeta { pinned: string[]; archived: string[]; hidden: string[]; unread: string[] }
export type MessageAction = 'pin' | 'unpin' | 'archive' | 'unarchive' | 'delete' | 'restore' | 'unread'
const EMPTY_META: MessageMeta = { pinned: [], archived: [], hidden: [], unread: [] }
const metaKey = (mode: string) => `edo:msgmeta:${mode}`

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
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [messageMeta, setMessageMeta] = useState<MessageMeta>(EMPTY_META)
  const dataRef = useRef<SchoolData | null>(null)
  dataRef.current = data
  const session = useRef<{ session: Session; remember: boolean } | null>(saved && 'session' in saved ? saved : null)

  const signOut = useCallback(() => {
    store.del(SESSION_KEY)
    store.del(metaKey('live'))
    setMessageMeta(EMPTY_META)
    store.del(CACHE_KEY)
    setUpdatedAt(null)
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
      const fetched = await fetchAll(s.session)
      const token = fetched.token
      // Messagerie illisible cette fois-ci : on garde la dernière liste connue (avec l'erreur signalée).
      const data = fetched.data.messages ? fetched.data : { ...fetched.data, messages: dataRef.current?.messages }
      s.session = { ...s.session, token }
      saveSession(s.session, s.remember)
      const at = Date.now()
      store.set(CACHE_KEY, { data, at } satisfies Cache, s.remember ? localStorage : sessionStorage)
      setData(data)
      setUpdatedAt(at)
      setError(null)
      setStatus('ready')
    } catch (e) {
      if (isAuthError(e)) {
        signOut()
        setError('Ta session a expiré, reconnecte-toi.')
      } else if (dataRef.current) {
        // Des données (cache) sont déjà affichées : on les garde et on prévient simplement.
        setError('Hors connexion : tes dernières données sont affichées.')
        setStatus('ready')
      } else {
        setError(e instanceof Error ? e.message : String(e))
        // Rien à afficher : retour à l'écran de connexion (la session reste enregistrée).
        setMode(null)
        setStatus('signed-out')
      }
    }
  }, [signOut])

  // Au démarrage : on reprend la session enregistrée.
  useEffect(() => {
    if (!saved) return
    if ('demo' in saved) {
      setData({ ...demoData, homework: store.get(DEMO_KEY) ?? demoData.homework })
      setStatus('ready')
    } else {
      // Ouverture instantanée avec les dernières données, puis actualisation en arrière-plan.
      const cached = store.get<Cache>(CACHE_KEY, saved.remember ? localStorage : sessionStorage)
      if (cached?.data) {
        // Pas d'attente du prochain rendu : si le réseau échoue tout de suite, load() doit déjà savoir
        // que des données sont affichées (sinon on retomberait sur la page de connexion).
        dataRef.current = cached.data
        setData(cached.data)
        setUpdatedAt(cached.at)
        setStatus('ready')
      }
      void load()
    }
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
      if (r.kind === 'qcm') setPendingQcm({ identifiant, motdepasse, remember, token: r.token, twoFa: r.twoFa, qcm: r.qcm })
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
      const { trust, twoFa } = await answerQcm(p.token, p.twoFa, choice)
      // cn/cv sont réutilisables : on les garde pour éviter le QCM la prochaine fois.
      if (p.remember) store.set(TRUST_KEY, { ...store.get<Record<string, DeviceTrust>>(TRUST_KEY), [trustKey(p.identifiant)]: trust })
      const r = await edLogin(p.identifiant, p.motdepasse, trust, twoFa)
      if (r.kind === 'qcm') setPendingQcm({ ...p, token: r.token, twoFa: r.twoFa, qcm: r.qcm })
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
        const remember = session.current.remember
        store.set(CACHE_KEY, { data: { ...d, homework }, at: Date.now() } satisfies Cache, remember ? localStorage : sessionStorage)
        setHomeworkDone(session.current.session, id, !hw.done).catch((e) => {
          setError(`Impossible d’enregistrer sur École Directe : ${e instanceof Error ? e.message : e}`)
          setData((d2) => d2 && { ...d2, homework: d2.homework.map((h) => (h.id === id ? { ...h, done: hw.done } : h)) })
        })
      }
      return { ...d, homework }
    })
  }, [mode])

  const loadWeek = useCallback(async (offset: number) => {
    const monday = displayedMonday()
    monday.setDate(monday.getDate() + offset * 7)
    const iso = isoDate(monday)
    if (mode === 'demo' || !session.current) return { lessons: demoData.lessons, monday: iso }
    const r = await fetchLessonsFor(session.current.session, monday)
    return { lessons: r.lessons, monday: iso }
  }, [mode])

  useEffect(() => {
    setMessageMeta(mode ? { ...EMPTY_META, ...store.get<MessageMeta>(metaKey(mode)) } : EMPTY_META)
  }, [mode])

  const messageAction = useCallback((id: string, action: MessageAction) => {
    if (!mode) return
    setMessageMeta((m) => {
      const without = (k: keyof MessageMeta) => m[k].filter((x) => x !== id)
      const add = (k: keyof MessageMeta) => (m[k].includes(id) ? m[k] : [...m[k], id])
      const next: MessageMeta = {
        pin: { ...m, pinned: add('pinned') },
        unpin: { ...m, pinned: without('pinned') },
        archive: { ...m, archived: add('archived'), pinned: without('pinned') },
        unarchive: { ...m, archived: without('archived') },
        delete: { ...m, hidden: add('hidden'), pinned: without('pinned'), archived: without('archived') },
        restore: { ...m, hidden: without('hidden') },
        unread: { ...m, unread: add('unread') },
      }[action]
      store.set(metaKey(mode), next)
      return next
    })
  }, [mode])

  const openMessage = useCallback(async (id: string) => {
    const detail = mode === 'demo' || !session.current
      ? (demoMessageDetails[id] ?? Promise.reject(new Error('Message introuvable')))
      : await fetchMessageDetail(session.current.session, id)
    setData((d) => d && { ...d, messages: d.messages?.map((m) => (m.id === id ? { ...m, read: true } : m)) })
    setMessageMeta((m) => {
      if (!m.unread.includes(id)) return m
      const next = { ...m, unread: m.unread.filter((x) => x !== id) }
      store.set(metaKey(mode ?? 'live'), next)
      return next
    })
    return detail
  }, [mode])

  const value = useMemo<Ctx>(() => ({
    status, mode, data, error, pendingQcm, refreshing, updatedAt, loadWeek, openMessage, messageMeta, messageAction,
    signIn, submitQcm, cancelQcm: () => setPendingQcm(null), startDemo, signOut, refresh, toggleHomework,
  }), [status, mode, data, error, pendingQcm, refreshing, updatedAt, loadWeek, openMessage, messageMeta, messageAction, signIn, submitQcm, startDemo, signOut, refresh, toggleHomework])

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

/** Messages avec l'organisation locale appliquée : masqués retirés, état lu/épinglé/archivé calculé. */
export function useMessages() {
  const { data, messageMeta: meta } = useSession()
  return (data?.messages ?? [])
    .filter((m) => !meta.hidden.includes(m.id))
    .map((m) => ({
      ...m,
      read: m.read && !meta.unread.includes(m.id),
      pinned: meta.pinned.includes(m.id),
      archived: meta.archived.includes(m.id),
    }))
}
