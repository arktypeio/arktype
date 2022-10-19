import { InternalArktypeError } from "../../internal.js"
import type { DynamicSpace } from "../../space.js"
import type { Scope } from "../scope.js"
import type { Terminal } from "../terminal/terminal.js"
import { Problems } from "./problems.js"

export class Traversal<Data = unknown> {
    private problemsByPath: Record<string, Problems> = {}
    private traversalStack: unknown[] = []
    private resolutionStack: ResolvedData[] = []
    private scopes: Scope[]
    // TODO: Option
    private delimiter = "."

    private path = ""

    constructor(public readonly data: Data, private space?: DynamicSpace) {
        // TODO: Add space scope,start alias
        this.scopes = []
    }

    pushKey(key: string | number) {
        this.traversalStack.push(this.data)
        this.path =
            this.path === ""
                ? String(key)
                : `${this.path}${this.delimiter}${key}`
    }

    popKey() {
        const lastDelimiterIndex = this.path.lastIndexOf(this.delimiter)
        this.path =
            lastDelimiterIndex === -1
                ? ""
                : this.path.slice(0, lastDelimiterIndex)
        // readonly modifier is to guide external use, but it is still most efficient
        // to directly set the value here.
        ;(this.data as any) = this.traversalStack.pop()!
    }

    addProblem(source: Terminal.Node) {
        if (!this.problemsByPath[this.path]) {
            this.problemsByPath[this.path] = new Problems()
        } else {
            this.problemsByPath[this.path]
        }
    }

    pushScope(scope: Scope) {
        this.scopes.push(scope)
    }

    popScope() {
        this.scopes.pop()
    }

    queryScopes<K1 extends RootKey, K2 extends ConfigKey<K1>>(
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

    resolve(alias: string) {
        const resolution = this.space?.[alias]
        if (!resolution) {
            throw new InternalArktypeError(
                `Unexpectedly failed to resolve alias '${alias}'`
            )
        }
        this.resolutionStack.push({
            alias,
            data: this.data,
            priorScopes: this.scopes
        })
        return resolution
    }

    popResolution() {
        this.scopes = this.resolutionStack.pop()!.priorScopes
    }
}

type ResolvedData = {
    alias: string
    data: unknown
    priorScopes: Scope[]
}

type OptionQueryResult<K1 extends RootKey, K2 extends ConfigKey<K1>> =
    | Required<Scope>[K1][K2]
    | undefined

type RootKey = keyof Scope

type ConfigKey<K1 extends RootKey> = keyof Required<Scope>[K1]
