declare module 'node:fs' {
  export function readFileSync(path: string | URL, encoding?: string): string;
}

declare module 'node:path' {
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
}

declare module 'node:url' {
  export function fileURLToPath(url: string | URL): string;
}
