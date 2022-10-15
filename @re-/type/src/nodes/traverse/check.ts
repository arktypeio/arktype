import { InternalArktypeError } from "../../internal.js"
import type { Base } from "../base.js"
import type { Scope } from "../scope.js"
import { Diagnostics } from "./diagnostics.js"

export namespace Check {
    type QueryResult<K1 extends RootKey, K2 extends ConfigKey<K1>> =
        | Required<Scope.Context>[K1][K2]
        | undefined

    export type RootKey = keyof Scope.Context

    export type ConfigKey<K1 extends RootKey> =
        keyof Required<Scope.Context>[K1]

    export class State<Data = unknown> {
        path: string[] = []
        contexts: Scope.Context[] = []
        unionDepth = 0
        // TODO: More efficient structure?
        checkedDataByAlias: Record<string, unknown[]> = {}
        errors: Diagnostics

        constructor(public data: Data) {
            this.errors = new Diagnostics()
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
