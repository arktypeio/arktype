import {
    type autocomplete,
    domainOf,
    objectKindOf,
    throwInternalError
} from "../../dev/utils/src/main.js"
import type { Node } from "../nodes/kinds.js"
import type { Generic } from "../type.js"
import { isDotAccessible } from "./state.js"
import type { TraversalState } from "./traverse.js"

type RegisteredInternalkey = "state"

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

export const registry = () => new Registry()

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

    register(value: object | symbol) {
        let variableName = baseNameFor(value)
        let suffix = 2
        while (variableName in this && this[variableName] !== value) {
            variableName = `${variableName}${suffix++}`
        }
        this[variableName] = value
        return this.reference(variableName)
    }

    reference = <key extends autocomplete<RegisteredInternalkey>>(key: key) =>
        `globalThis.$ark.${key}` as const
}

const baseNameFor = (value: object | symbol) => {
    switch (typeof value) {
        case "function":
            return isDotAccessible(value.name)
                ? value.name
                : "anonymousFunction"
        case "symbol":
            return value.description && isDotAccessible(value.description)
                ? value.description
                : "anonymousSymbol"
        default:
            const objectKind = objectKindOf(value)
            if (!objectKind) {
                return throwInternalError(
                    `Unexpected attempt to register serializable value of type ${domainOf(
                        value
                    )}`
                )
            }
            // convert to camelCase
            return objectKind[1].toLowerCase() + objectKind.slice(1)
    }
}
