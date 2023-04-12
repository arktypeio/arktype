import type { constructor } from "../utils/generics.js"
// TODO: move this and other non-nodes out of nodes dir

const registry = {
    constructor: {} as Record<string, constructor>,
    value: {} as Record<string, object | symbol>
}

type Registry = typeof registry
;(globalThis as any).$ark = registry

type RegistryKey = keyof Registry

const composeUncachedRegistrar =
    <kind extends RegistryKey>(kind: kind) =>
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
