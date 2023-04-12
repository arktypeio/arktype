// TODO: move this and other non-nodes out of nodes dir

import type { ark } from "../main.js"
import type { TraversalState } from "../nodes/traverse.js"
import type { autocomplete } from "./generics.js"

type RequiredEntries = {
    ark: typeof ark
    state: typeof TraversalState
}

type RequiredKey = keyof RequiredEntries

type Registry = {
    [k: string]: unknown
} & RequiredEntries

const registry = {} as Registry

;(globalThis as any).$ark = registry

export const register = <key extends autocomplete<RequiredKey>>(
    baseKey: key,
    value: Registry[key]
) => {
    let registryKey: string = baseKey
    let suffix = 2
    while (
        registryKey in registry.constructor &&
        registry[registryKey] !== value
    ) {
        registryKey = `${baseKey}${suffix++}`
    }
    registry[registryKey] = value
    // TODO: . access
    return referenceRegistered(registryKey)
}

export const getRegistered = <key extends autocomplete<RequiredKey>>(
    key: key
) => registry[key]

export const referenceRegistered = <key extends autocomplete<RequiredKey>>(
    key: key
    // TODO: .access
) => `globalThis.$ark.${key}` as const
