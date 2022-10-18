import { InternalArktypeError } from "../../internal.js"
import type { DynamicSpace } from "../../space.js"
import type { Scope } from "../scope.js"
import type { Keyword } from "../terminal/keyword/keyword.js"
import type { Problems } from "./problems.js"

export class TraversalState<Data = unknown> {
    private traversalStack: TraversedData[]
    private resolutionStack: ResolvedData[]

    constructor(data: Data, private space?: DynamicSpace) {
        this.traversalStack = [{ key: "/", data }]
        // TODO: Add space scope, maybe start alias?
        this.resolutionStack = [{ alias: "/", data, scopes: [] }]
    }

    get data() {
        return this.traversalStack[this.traversalStack.length - 1].data
    }

    pushKey(key: string) {
        this.traversalStack.push({ key, data: (this.data as any)[key] })
    }

    popKey() {
        this.traversalStack.pop()
    }

    private get scopes() {
        return this.resolutionStack[this.resolutionStack.length - 1].scopes
    }

    pushScope(scope: Scope) {
        this.scopes.push(scope)
    }

    popScope() {
        this.scopes.pop()
    }

    queryOption<K1 extends RootKey, K2 extends ConfigKey<K1>>(
        baseKey: K1,
        specifierKey: K2
    ): OptionQueryResult<K1, K2> {
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

    pushResolve(alias: string) {
        const resolution = this.space?.[alias]
        if (!resolution) {
            throw new InternalArktypeError(
                `Unexpectedly failed to resolve alias '${alias}'`
            )
        }
        this.resolutionStack.push({
            alias,
            data: this.data,
            // TODO: Ambient scope
            scopes: []
        })
        return resolution
    }

    popResolution() {
        this.resolutionStack.pop()
    }
}

export type Properties = Partial<Record<Keyword.Definition, 1>>

export type TraversedData = {
    key: string
    data: unknown
    properties?: Properties
    problems?: Problems
}

export type ResolvedData = {
    alias: string
    data: unknown
    scopes: Scope[]
}

type OptionQueryResult<K1 extends RootKey, K2 extends ConfigKey<K1>> =
    | Required<Scope>[K1][K2]
    | undefined

export type RootKey = keyof Scope

export type ConfigKey<K1 extends RootKey> = keyof Required<Scope>[K1]
