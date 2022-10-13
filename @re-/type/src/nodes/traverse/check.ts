import type { Dictionary, NormalizedJsTypes } from "@re-/tools"
import { IsAnyOrUnknown, jsTypeOf } from "@re-/tools"
import { InternalArktypeError } from "../../internal.js"
import type { Scope } from "../scope.js"
import { Diagnostics } from "./diagnostics.js"

export namespace Check {
    type QueryResult<K1 extends RootKey, K2 extends ConfigKey<K1>> =
        | Required<Scope.Context>[K1][K2]
        | undefined

    export type RootKey = keyof Scope.Context

    export type ConfigKey<K1 extends RootKey> =
        keyof Required<Scope.Context>[K1]

    // TODO: Compare recursion perf
    export const checkData = (root: any, data: unknown, state: State) => {
        const stack = [root]
        while (stack.length) {
            const precondition = stack[stack.length - 1].precondition
            if (precondition) {
                stack.push(precondition)
                continue
            }
            const node = stack.pop()
            const postcondition = node.allows(data)
            if (postcondition === true) {
                return true
            }
            if (postcondition === false) {
                state.errors.push()
                return false
            }
            stack.push(postcondition)
        }
        // TODO: Will this happen? When?
        return true
    }

    const traverseObject = (root: any, data: Dictionary, state: State) => {}

    const traverseArray = (root: any, data: unknown[], state: State) => {}

    export const traverse = (root: any, data: unknown, state: State) => {
        const shallowResult = checkData(root, data, state)
        const isStructured = typeof data === "object" && data !== null
        if (isStructured) {
            // TODO: Root structure nodes
            if (Array.isArray(data)) {
                for (let i = 0; i < data.length; i++) {
                    traverse(root, data[i], state)
                }
            } else {
                for (const k in data) {
                    traverse(root, data[k], state)
                }
            }
        } else {
            checkData()
        }
    }

    export class State {
        path: string[] = []
        private contexts: Scope.Context[] = []
        unionDepth = 0
        // TODO: More efficient structure?
        checkedDataByAlias: Record<string, unknown[]> = {}
        errors: Diagnostics

        constructor() {
            this.errors = new Diagnostics(this)
        }

        clearContexts() {
            const priorContexts = this.contexts
            this.contexts = []
            return priorContexts
        }

        restoreContexts(contexts: Scope.Context[]) {
            this.contexts = contexts
        }

        pushContext(context: Scope.Context) {
            this.contexts.push(context)
        }

        popContext() {
            this.contexts.pop()
        }

        queryContext<K1 extends RootKey, K2 extends ConfigKey<K1>>(
            baseKey: K1,
            specifierKey: K2
        ): QueryResult<K1, K2> {
            for (let i = this.contexts.length - 1; i >= 0; i--) {
                const baseConfig = this.contexts[i][baseKey] as any
                if (baseConfig) {
                    const specifierConfig =
                        baseConfig[specifierKey] ?? baseConfig["$"]
                    if (specifierConfig !== undefined) {
                        return specifierConfig
                    }
                }
            }
        }

        resolve(alias: string) {
            const resolution = this.contexts[0]?.resolutions?.[alias]
            if (!resolution) {
                throw new InternalArktypeError(
                    `Unexpectedly failed to resolve alias '${alias}'`
                )
            }
            return resolution
        }
    }
}
