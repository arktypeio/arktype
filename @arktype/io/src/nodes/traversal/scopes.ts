import { InternalArktypeError } from "../../internal.js"
import type { Scope } from "../scope.js"

type QueryResult<K1 extends RootKey, K2 extends ConfigKey<K1>> =
    | Required<Scope>[K1][K2]
    | undefined

export type RootKey = keyof Scope

export type ConfigKey<K1 extends RootKey> = keyof Required<Scope>[K1]

export class Scopes {
    private scopes: Scope[] = []
    private resolutions: Scope[][] = []

    push(scope: Scope) {
        return this.scopes.push(scope)
    }

    pop() {
        return this.scopes.pop()
    }

    query<K1 extends RootKey, K2 extends ConfigKey<K1>>(
        baseKey: K1,
        specifierKey: K2
    ): QueryResult<K1, K2> {
        for (let i = this.scopes.length - 1; i >= 0; i--) {
            const baseConfig = this.scopes[i][baseKey] as any
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
        // TODO: Test perf/design of resolving from state, maybe don't need it here?
        // Don't think there will ever be names at a lower level? Would mean we
        // don't need scope if there are no options, seems better separation of responsibilities
        const resolution = this.scopes[0]?.resolutions?.[alias]
        if (!resolution) {
            throw new InternalArktypeError(
                `Unexpectedly failed to resolve alias '${alias}'`
            )
        }
        this.resolutions.push(this.scopes)
        this.scopes = []
        return resolution
    }

    restoreResolved() {
        this.scopes = this.resolutions.pop()!
    }
}
