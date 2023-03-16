import type { Scope } from "../scopes/scope.ts"
import type { QualifiedTypeName, Type, TypeConfig } from "../scopes/type.ts"
import { DataWrapper } from "../utils/data.ts"
import type { xor } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import type { ProblemCode, ProblemParameters } from "./problems.ts"
import { Problem, Problems } from "./problems.ts"

export const CheckResult = class {
    data?: unknown
    problems?: Problems
} as new (state: TraversalState) => CheckResult

export type CheckResult<out = unknown> = xor<
    { data: out },
    { problems: Problems }
>

export class TraversalState {
    path = new Path()
    problems: Problems = new Problems()
    entriesToPrune: [data: Record<string, unknown>, key: string][] = []
    config: TypeConfig

    readonly rootScope: Scope

    #seen: { [name in QualifiedTypeName]?: object[] } = {}

    constructor(public type: Type) {
        this.rootScope = type.scope
        this.config = type.config
    }

    mustBe(mustBe: string, context?: ProblemContextInput<"custom">) {
        return this.reject("custom", mustBe, context)
    }

    reject<code extends ProblemCode>(
        code: code,
        ...args: ProblemParameters<code>
    ) {
        const problem = new Problem(
            // avoid a bunch of errors from TS trying to discriminate the
            // problem input based on the code
            code as any,
            "reason",
            {
                // copy the path to avoid future mutations affecting it
                path: ctx?.path ?? new Path(...this.path),
                // we have to check for the presence of the key explicitly since the
                // data could be nullish
                data: new DataWrapper("data" in ctx ? ctx.data : ({} as any)),
                mustBe: "",
                was: ""
            }
        )
        this.problems.add(problem)
        return false
    }

    // traverseKey(key: stringKeyOf<this["data"]>, node: TraversalNode): boolean {
    //     const lastData = this.data
    //     this.data = this.data[key] as data
    //     this.path.push(key)
    //     const isValid = traverse(node, this)
    //     this.path.pop()
    //     if (lastData[key] !== this.data) {
    //         lastData[key] = this.data as any
    //     }
    //     this.data = lastData
    //     return isValid
    // }

    // traverseResolution(name: string): boolean {
    //     const resolution = this.type.scope.resolve(name)
    //     const id = resolution.qualifiedName
    //     // this assignment helps with narrowing
    //     const data = this.data
    //     const isObject = hasDomain(data, "object")
    //     if (isObject) {
    //         const seenByCurrentType = this.#seen[id]
    //         if (seenByCurrentType) {
    //             if (seenByCurrentType.includes(data)) {
    //                 // if data has already been checked by this alias as part of
    //                 // a resolution higher up on the call stack, it must be valid
    //                 // or we wouldn't be here
    //                 return true
    //             }
    //             seenByCurrentType.push(data)
    //         } else {
    //             this.#seen[id] = [data]
    //         }
    //     }
    //     const lastType = this.type
    //     this.type = resolution
    //     const isValid = traverse(resolution.flat, this)
    //     this.type = lastType
    //     if (isObject) {
    //         this.#seen[id]!.pop()
    //     }
    //     return isValid
    // }

    // traverseBranches(branches: TraversalEntry[][]): boolean {
    //     const lastFailFast = this.failFast
    //     this.failFast = true
    //     const lastProblems = this.problems
    //     const branchProblems = new Problems(this)
    //     this.problems = branchProblems
    //     const lastPath = this.path
    //     const lastKeysToPrune = this.entriesToPrune
    //     let hasValidBranch = false
    //     for (const branch of branches) {
    //         this.path = new Path()
    //         this.entriesToPrune = []
    //         if (checkEntries(branch, this)) {
    //             hasValidBranch = true
    //             lastKeysToPrune.push(...this.entriesToPrune)
    //             break
    //         }
    //     }
    //     this.path = lastPath
    //     this.entriesToPrune = lastKeysToPrune
    //     this.problems = lastProblems
    //     this.failFast = lastFailFast
    //     return hasValidBranch || !this.problems.add("branches", branchProblems)
    // }
}

export type TraversalConfig = {
    [k in keyof TypeConfig]-?: TypeConfig[k][]
}
