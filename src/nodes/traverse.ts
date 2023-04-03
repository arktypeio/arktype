import type { Scope } from "../scopes/scope.ts"
import type { xor } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import type { Problem, ProblemCode, ProblemParameters } from "./problems.ts"
import { Problems, problemsByCode } from "./problems.ts"
import type { Type } from "./type.ts"

export const CheckResult = class {
    data?: unknown
    problems?: Problems
} as new (state: TraversalState) => CheckResult

export type CheckResult<out = unknown> = xor<
    { data: out },
    { problems: Problems }
>

export class TraversalState {
    basePath = new Path()
    problems: Problems = new Problems()
    entriesToPrune: [data: Record<string, unknown>, key: string][] = []
    config: TypeConfig

    readonly rootScope: Scope

    // Qualified
    #seen: { [name in string]?: object[] } = {}

    constructor(public type: Type) {
        this.rootScope = type.scope
        this.config = type.config
    }

    mustBe(mustBe: string, data: unknown, path: Path) {
        return this.addProblem("custom", mustBe, data, path)
    }

    addProblem<code extends ProblemCode>(
        code: code,
        ...args: ProblemParameters<code>
    ) {
        // TODO: fix
        const problem = new problemsByCode[code](
            ...(args as [any, any, any])
        ) as any as Problem
        return this.problems.add(problem)
    }

    reject<code extends ProblemCode>(
        code: code,
        ...args: ProblemParameters<code>
    ) {
        return !this.addProblem(code, ...args)
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
