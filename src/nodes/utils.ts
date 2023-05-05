import type { Segments } from "../utils/lists.js"

export const In = "$arkIn" as const

export type CompiledPath = `${typeof In}${string}`

export const insertInitialPropAccess = (
    path: CompiledPath,
    key: string
): CompiledPath => `${In}${compilePropAccess(key)}${path.slice(In.length)}`

export const insertUniversalPropAccess = <s extends string>(
    assertion: s,
    key: string
) => assertion.replaceAll(In, `${In}${compilePropAccess(key)}`) as s

export const compilePathAccess = (segments: Segments, root = In) => {
    for (const segment of segments) {
        root += compilePropAccess(segment)
    }
    return root
}

export const compilePropAccess = (key: string | number) => {
    if (typeof key === "number") {
        return `[${key}]`
    }
    return /^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(key)
        ? `.${key}`
        : `[${/^\$\{.*\}$/.test(key) ? key.slice(2, -1) : JSON.stringify(key)}]`
}
