import type { IncomingMessage, ServerResponse } from 'node:http'
export declare function profilesApi(prefix?: string): (req: IncomingMessage, res: ServerResponse, next: () => void) => void
export declare function bindSession(sessionId: string, accountId: string | number): Promise<void>
