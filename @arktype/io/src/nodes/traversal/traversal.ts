import { InternalArktypeError } from "../../internal.js"
import type { DynamicSpace } from "../../space.js"
import type { Base } from "../base.js"
import type { Scope } from "../scope.js"
import type { Keyword } from "../terminal/keyword/keyword.js"
import { Problem } from "./problems.js"

export class TraversalState<Data = unknown> {
    private attributes: Record<string, Attributes> = {}
    private traversalStack: unknown[] = []
    private resolutionStack: ResolvedData[] = []
    private scopes: Scope[]

    private path = ""

    constructor(public readonly data: Data, private space?: DynamicSpace) {
        // TODO: Add space scope,start alias
        this.scopes = []
    }

    pushKey(key: string) {
        this.traversalStack.push(this.data)
        this.path = pushedPath(this.path, key)
    }

    popKey() {
        this.path = poppedPath(this.path)
        // readonly modifier is to guide external use, but it is still most efficient
        // to directly set the value here.
        ;(this.data as any) = this.traversalStack.pop()!
    }

    addAttribute(source: Base.Node, allowed: boolean) {
        // TODO: Add problems to list as they occur at path so we don't have to filter attributes later?
        const attributeValue = allowed ? true : new Problem(source, this)
        if (this.path in this.attributes) {
            // TODO: Maybe not kind, something similar but more flexible?
            this.attributes[this.path][source.kind] = attributeValue
        } else {
            this.attributes[this.path] = { [source.kind]: attributeValue }
        }
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

export type AttributeName = Keyword.Definition

// TODO: Could attributeName be node kind? Each node could define it's own type.
//  keywords would just be true or false, but other scould have parameters
export type Attributes = Partial<
    Record<AttributeName, true | Problem<Base.Node>>
>

const pushedPath = (path: string, key: string, delimiter = ".") =>
    path === "" ? key : path + delimiter + key

const poppedPath = (path: string, delimiter = ".") => {
    const lastDelimiterIndex = path.lastIndexOf(delimiter)
    return lastDelimiterIndex === -1 ? "" : path.slice(0, lastDelimiterIndex)
}

export type ResolvedData = {
    alias: string
    data: unknown
    priorScopes: Scope[]
}

type OptionQueryResult<K1 extends RootKey, K2 extends ConfigKey<K1>> =
    | Required<Scope>[K1][K2]
    | undefined

export type RootKey = keyof Scope

export type ConfigKey<K1 extends RootKey> = keyof Required<Scope>[K1]
