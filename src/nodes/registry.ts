import type { constructor, extend } from "../utils/generics.ts"

const registry = {
    constructor: {} as Record<string, constructor>,
    value: {} as Record<string, object | symbol>,
    regex: {} as Record<string, RegExp>
}

type Registry = typeof registry
;(globalThis as any).$ark = registry

type CachedRegistryKey = extend<keyof Registry, "regex">

type UncachedRegistryKey = Exclude<keyof Registry, CachedRegistryKey>

const composeUncachedRegistrar =
    <kind extends UncachedRegistryKey>(kind: kind) =>
    (baseName: string, value: Registry[kind][string]) => {
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

export const registerValue = composeUncachedRegistrar("value")

export const registerConstructor = composeUncachedRegistrar("constructor")

const regexKeysBySource: { [source: string]: string } = {}
let regexCacheSize = 0

export const registerRegex = (source: string) => {
    if (!regexKeysBySource[source]) {
        const registryKey = "$" + regexCacheSize
        registry.regex[registryKey] = new RegExp(source)
        regexKeysBySource[source] = registryKey
        regexCacheSize++
    }
    return `globalThis.$ark.regex.${regexKeysBySource[source]}`
}
