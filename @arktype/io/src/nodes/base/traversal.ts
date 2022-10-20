import { InternalArktypeError } from "../../internal.js"
import type { DynamicSpace, DynamicSpaceRoot } from "../../space.js"
import type { Scope } from "../expression/infix/scope.js"
import type { Node } from "./node.js"
import type { ProblemSource } from "./problems.js"
import { Problems, Stringifiable } from "./problems.js"

export class Traversal<Data = unknown> {
    // TODO: Is perf better if these don't get initialized?
    public problems = new Problems()
    private problemsStack: Problems[] = []
    private traversalStack: unknown[] = []
    private resolutionStack: ResolvedData[] = []
    private space?: DynamicInternalSpace
    private scopes: Scope[]
    // TODO: Option
    private delimiter = "."
    private path = ""
    private unionDepth = 0

    constructor(public readonly data: Data, space?: DynamicSpace) {
        // TODO: Add space scope,start alias
        this.scopes = []
        this.space = space as DynamicInternalSpace
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

    addProblem(source: ProblemSource) {
        this.problems.addIfUnique(
            source,
            this.path,
            new Stringifiable(this.data as any)
        )
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

    pushBranch() {
        this.problemsStack.push(this.problems)
        this.problems = new Problems()
        this.unionDepth++
    }

    popBranch() {
        this.problems = this.problemsStack.pop()!
        this.unionDepth--
    }

    resolve(alias: string) {
        const resolution = this.space?.[alias]
        if (!resolution) {
            throw new InternalArktypeError(
                `Unexpectedly failed to resolve alias '${alias}'`
            )
        }
        if (
            this.resolutionStack.some(
                (previouslyResolved) =>
                    alias === previouslyResolved.alias &&
                    this.data === previouslyResolved.data
            )
        ) {
            // If data has already been checked by this alias during this
            // traversal, it must be valid or we wouldn't be here, so we can
            // stop traversing.
            return
        }
        this.resolutionStack.push({
            alias,
            data: this.data,
            priorScopes: this.scopes
        })
        this.scopes = []
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

type DynamicInternalSpace = Record<string, Node> & { $: DynamicSpaceRoot }
