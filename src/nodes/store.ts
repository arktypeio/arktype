import type { constructor } from "../utils/generics.ts"

const registry = {
    constructor: {} as Record<string, constructor>,
    value: {} as Record<string, object | symbol>
}

type GlobalStore = typeof registry
;(globalThis as any).$ark = registry

export const compileRegistered = <
    registeredKind extends "constructor" | "value"
>(
    kind: registeredKind,
    baseName: string,
    value: GlobalStore[registeredKind][string]
) => {
    let registryKey = baseName
    let suffix = 2
    while (
        registryKey in registry.constructor &&
        registry[kind][registryKey] !== value
    ) {
        registryKey = `${baseName}${suffix++}`
    }
    registry[kind][registryKey] = value
    // TODO: . access
    return `globalThis.$ark.${kind}.${registryKey}`
}
