import type { IncomingMessage, ServerResponse } from 'node:http'
export declare const ED_VERSION: string
export declare function edProxy(prefix?: string): (req: IncomingMessage, res: ServerResponse, next: () => void) => void
