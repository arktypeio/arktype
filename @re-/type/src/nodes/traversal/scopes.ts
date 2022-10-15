import { InternalArktypeError } from "../../internal.js"
import type { Scope } from "../scope.js"

type QueryResult<K1 extends RootKey, K2 extends ConfigKey<K1>> =
    | Required<Scope>[K1][K2]
    | undefined

export type RootKey = keyof Scope

export type ConfigKey<K1 extends RootKey> = keyof Required<Scope>[K1]

export class Scopes {
    private scopes: Scope[] = []

    push(scope: Scope) {
        this.scopes.push(scope)
    }

    pop() {
        this.scopes.pop()
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
        const resolution = this.scopes[0]?.resolutions?.[alias]
        if (!resolution) {
            throw new InternalArktypeError(
                `Unexpectedly failed to resolve alias '${alias}'`
            )
        }
        return resolution
    }
}
