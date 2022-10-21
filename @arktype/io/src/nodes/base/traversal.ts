import { InternalArktypeError } from "../../internal.js"
import type { ArktypeSpace } from "../../space.js"
import type { ArktypeConfig } from "../../type.js"
import type { Scope } from "../expression/infix/scope.js"
import type { ProblemSource } from "./problems.js"
import { Problems, Stringifiable } from "./problems.js"

export class Traversal<Data = unknown> {
    // TODO: Is perf better if these don't get initialized?
    public problems = new Problems()
    private problemsStack: Problems[] = []
    private traversalStack: unknown[] = []
    private resolutionStack: ResolvedData[] = []
    private scopes: Scope.Node[]
    // TODO: Option
    private delimiter = "."
    private path = ""
    private unionDepth = 0

    constructor(public readonly data: Data, private space?: ArktypeSpace) {
        this.scopes = []
    }

    pushKey(key: string | number) {
        this.traversalStack.push(this.data)
        // readonly modifier is to guide external use, but it is still most efficient
        // to directly set the value here.
        ;(this.data as any) = (this.data as any)[key]
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
        ;(this.data as any) = this.traversalStack.pop()!
    }

    addProblem(source: ProblemSource) {
        this.problems.addIfUnique(
            source,
            this.path,
            new Stringifiable(this.data as any)
        )
    }

    pushScope(scope: Scope.Node) {
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
            const baseConfig = this.scopes[i].config[baseKey] as any
            if (baseConfig) {
                const specifierConfig =
                    baseConfig[specifierKey] ?? baseConfig["$"]
                if (specifierConfig !== undefined) {
                    return specifierConfig
                }
            }
        }
        return this.space?.$.config[baseKey]?.[specifierKey]
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
        const resolution = this.space?.[alias].root
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
    priorScopes: Scope.Node[]
}

type OptionQueryResult<K1 extends RootKey, K2 extends ConfigKey<K1>> =
    | Required<ArktypeConfig>[K1][K2]
    | undefined

type RootKey = keyof ArktypeConfig

type ConfigKey<K1 extends RootKey> = keyof Required<ArktypeConfig>[K1]
