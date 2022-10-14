import { InternalArktypeError } from "../../internal.js"
import { Base } from "../base.js"
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
    export const checkRoot = (root: Base.Node, data: any, state: State) => {
        const stack = [root]
        let lastResult: Base.AllowsResult = root
        do {
            if (lastResult.precondition) {
                stack.push(lastResult.precondition)
            } else {
                lastResult = stack.pop()!.allows(data)
                if (lastResult === false) {
                    state.errors.push()
                    return false
                }
            }
        } while (lastResult instanceof Base.Node)
        return lastResult
    }

    export const traverse = (root: Base.Node, data: any, state: State) => {
        const result = checkRoot(root, data, state)
        if (typeof result === "number") {
            for (let i = 0; i < result; i++) {
                traverse(root.childForKey!(i), data[i], state)
            }
        } else if (Array.isArray(result)) {
            for (const childKey of result) {
                traverse(root.childForKey!(childKey), data[childKey], state)
            }
        }
        return state
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
