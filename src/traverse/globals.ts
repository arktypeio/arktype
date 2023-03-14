import type { constructor } from "../utils/generics.ts"

export const globals = {
    constructors: {} as Record<string, constructor>
}
;(globalThis as any).$ark = globals

export const getCompiledGlobal = (kind: keyof typeof globals, key: string) =>
    // TODO: . access
    `globalThis.$ark.${kind}.${key}`
