// TODO: move this and other non-nodes out of nodes dir
import type { ark } from "../main.js"
import type { autocomplete } from "../utils/generics.js"
import type { CheckResult, TraversalState } from "./traverse.js"

type PrepopulatedKey = "ark" | "state"

class Registry {
    [k: string]: unknown
    declare ark: typeof ark
    declare state: typeof TraversalState
    declare result: typeof CheckResult

    constructor() {
        const global = globalThis as any
        if (global.$ark) {
            return global.$ark as Registry
        }
        global.$ark = this
    }

    register<key extends autocomplete<PrepopulatedKey>>(
        baseKey: key,
        value: Registry[key]
    ) {
        let k: string = baseKey
        let suffix = 2
        while (k in this && this[k] !== value) {
            k = `${baseKey}${suffix++}`
        }
        this[k] = value
        return this.reference(k)
    }

    reference = <key extends autocomplete<PrepopulatedKey>>(
        key: key
        // TODO: .access
    ) => `globalThis.$ark.${key}` as const
}

export const registry = () => new Registry()
