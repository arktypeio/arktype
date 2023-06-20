import type { autocomplete } from "../../dev/utils/src/generics.js"
import type { AbstractableConstructor } from "../../dev/utils/src/objectKinds.js"
import type { Node } from "../nodes/kinds.js"
import type { Generic } from "../type.js"
import { compilePropAccess } from "./state.js"
import type { TraversalState } from "./traverse.js"

type RegisteredInternalkey = "state"

export type RegisteredKinds = {
    morph: (...args: never[]) => unknown
    narrow: (...args: never[]) => unknown
    value: object | symbol
    constructor: AbstractableConstructor
}

export type ArkKinds = {
    node: Node
    generic: Generic
}
export const arkKind = Symbol("ArkTypeInternalKind")

export type ArkKind = keyof ArkKinds

export const hasArkKind = <kind extends ArkKind>(
    value: unknown,
    kind: kind
): value is ArkKinds[kind] => (value as any)?.[arkKind] === kind

export type InternalId = "problems" | "result"

export type PossiblyInternalObject = { $arkId?: InternalId } | undefined | null

class Registry {
    [k: string]: unknown
    declare state: typeof TraversalState

    constructor() {
        const global = globalThis as any
        if (global.$ark) {
            return global.$ark as Registry
        }
        global.$ark = this
    }

    registerInternal<key extends RegisteredInternalkey>(
        key: key,
        value: Registry[key]
    ) {
        this[key] = value as never
    }

    register<kind extends keyof RegisteredKinds>(
        kind: kind,
        baseName: string,
        value: RegisteredKinds[kind]
    ) {
        let k = `${kind}${baseName}`
        let suffix = 2
        while (k in this && this[k] !== value) {
            k = `${baseName}${suffix++}`
        }
        this[k] = value
        return this.reference(k)
    }

    reference = <key extends autocomplete<RegisteredInternalkey>>(key: key) =>
        `globalThis.$ark${compilePropAccess(key)}` as const
}

export const registry = () => new Registry()
