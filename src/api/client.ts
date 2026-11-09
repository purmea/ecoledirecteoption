// Appels bas niveau vers École Directe, via le proxy du serveur (/ed/v3/...).

export class EdError extends Error {
  constructor(public code: number, message: string) {
    super(message)
  }
}

/** Le token a expiré ou est invalide : il faut se reconnecter. */
export const isAuthError = (e: unknown) => e instanceof EdError && [520, 525].includes(e.code)

interface EdResponse<T> {
  code: number
  token?: string
  message?: string | null
  data: T
}

const SESSION_KEY = 'edo:proxy-session'

/** Identifiant aléatoire qui permet au proxy de garder les cookies École Directe de cet appareil. */
function proxySession() {
  try {
    let id = localStorage.getItem(SESSION_KEY)
    if (!id) localStorage.setItem(SESSION_KEY, (id = crypto.randomUUID()))
    return id
  } catch {
    return (proxySession.fallback ??= crypto.randomUUID())
  }
}
proxySession.fallback = undefined as string | undefined

export interface RequestResult<T> {
  data: T
  token?: string
  /** En-tête 2FA-Token renvoyé par École Directe (à renvoyer à l'appel suivant). */
  twoFa?: string
  code: number
}

/**
 * Envoie une requête à École Directe. Toutes les routes passent en POST avec un
 * paramètre `verbe` et un corps `data={json}`.
 */
export async function edRequest<T>(
  path: string,
  body: unknown = {},
  { verbe = 'get', token, twoFa, allowCodes = [] }: { verbe?: string; token?: string; twoFa?: string; allowCodes?: number[] } = {},
): Promise<RequestResult<T>> {
  const sep = path.includes('?') ? '&' : '?'
  const url = `./ed${path}${verbe ? `${sep}verbe=${verbe}` : ''}`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Session': proxySession(),
        ...(token ? { 'X-Token': token } : {}),
        ...(twoFa ? { '2FA-Token': twoFa } : {}),
      },
      body: 'data=' + encodeURIComponent(JSON.stringify(body)),
    })
  } catch {
    throw new EdError(0, 'Pas de connexion au serveur. Vérifie ton réseau.')
  }

  const text = await res.text()
  let json: EdResponse<T>
  try {
    json = JSON.parse(text)
  } catch {
    // Pas de JSON : on ne parle pas au proxy de l'app (version statique, hébergeur qui bloque le POST…)
    // ou École Directe a renvoyé autre chose. Le début de la réponse aide au diagnostic.
    console.warn(`[ed] réponse non JSON pour ${path} (HTTP ${res.status}) :`, text.slice(0, 300))
    throw new EdError(-1, res.ok && text.trim().startsWith('{')
      ? 'École Directe a renvoyé une réponse inattendue. Réessaie dans un instant.'
      : `Le serveur de l’app est injoignable ici (HTTP ${res.status}). La connexion ne marche qu’en lançant l’app avec npm run dev ou npm start.`)
  }

  const newToken = json.token || res.headers.get('X-Token') || undefined
  if (json.code !== 200 && !allowCodes.includes(json.code)) {
    throw new EdError(json.code, json.message || messageFor(json.code))
  }
  return { data: json.data, token: newToken, twoFa: res.headers.get('2FA-Token') || undefined, code: json.code }
}

function messageFor(code: number) {
  switch (code) {
    case 505: return 'Identifiant ou mot de passe incorrect.'
    case 517: return 'Version de l’API refusée par École Directe.'
    case 520:
    case 525: return 'Ta session a expiré, reconnecte-toi.'
    case 535: return 'École Directe est en maintenance, réessaie plus tard.'
    default: return `Erreur École Directe (code ${code}).`
  }
}

/** Décode du base64 UTF-8 (questions du QCM, contenu des devoirs). */
export function b64decode(s: string) {
  try {
    const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch {
    return s
  }
}

/** Vérifie que le proxy École Directe de l'app répond (sinon seule la démo est possible). */
export async function proxyAvailable() {
  try {
    const r = await fetch('./ed/health', { cache: 'no-store' })
    return r.ok && (await r.json()).ok === true
  } catch {
    return false
  }
}
