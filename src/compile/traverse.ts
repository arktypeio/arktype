import type { TypeConfig } from "../type.js"
import { Type } from "../type.js"
import type { PathLike } from "../utils/lists.js"
import { Path } from "../utils/lists.js"
import type { ProblemCode, ProblemParameters } from "./problems.js"
import { Problem, Problems, problemsByCode } from "./problems.js"

import type { PossiblyInternalObject } from "./registry.js"

export class CheckResult<out = unknown, valid extends boolean = boolean> {
    declare data: valid extends true ? out : never
    declare problems: valid extends true ? never : Problems

    constructor(result: unknown) {
        if ((result as PossiblyInternalObject)?.$arkId === "problems") {
            this.problems = result as never
        } else {
            this.data = result as never
        }
    }
}

export class TraversalState {
    basePath = new Path()
    problemsStack: Problems[] = [new Problems()]
    // TODO: add morphs here
    entriesToPrune: [data: Record<string, unknown>, key: string][] = []

    // Qualified
    private seen: { [name in string]?: object[] } = {}

    constructor() {}

    get problems() {
        return this.problemsStack.at(-1)!
    }

    pushUnion() {
        this.problemsStack.push(new Problems())
    }

    popUnion(branchCount: number, data: unknown, path: string[]) {
        const branchProblems = this.problemsStack.pop()!
        if (branchProblems.count === branchCount) {
            this.addProblem("union", branchProblems, data, path)
        }
    }

    finalize(data: unknown): CheckResult {
        if (this.problems.count) {
            return new CheckResult(this.problems)
        }
        for (const [o, k] of this.entriesToPrune) {
            delete o[k]
        }
        return new CheckResult(data)
    }

    // TODO: add at custom path

    mustBe(mustBe: string, data: unknown, path: PathLike = []) {
        return this.addProblem("custom", mustBe, data, Path.from(path))
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

    inherit(result: CheckResult, path: PathLike): this is { problems: [] }
    inherit(
        result: Type,
        path: PathLike,
        data: unknown
    ): this is { problems: [] }
    inherit(result: Problems, path: PathLike): this is { problems: [] }
    inherit(result: Problem, path: PathLike): this is { problems: [] }
    inherit(
        result: CheckResult | Type | Problems | Problem,
        path: PathLike,
        data?: unknown
    ): this is { problems: [] } {
        const problems: readonly Problem[] =
            result instanceof CheckResult
                ? result.problems
                : result instanceof Type
                ? result(path.reduce((v, e) => v[e], data as any)).problems
                : result instanceof Problem
                ? [result]
                : result
        if (problems) {
            for (const p of problems) {
                this.addProblem(p.code, p.rule, p.data.value, [
                    ...path,
                    ...p.path
                ])
            }
        }
        return this.ok
    }

    get ok() {
        return this.problems.length === 0
    }
}

export type TraversalConfig = {
    [k in keyof TypeConfig]-?: TypeConfig[k][]
}
