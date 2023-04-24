import type { TypeConfig } from "../type.js"
import { Path } from "../utils/paths.js"
import type { Problem, ProblemCode, ProblemParameters } from "./problems.js"
import { Problems, problemsByCode } from "./problems.js"

export class CheckResult<out = unknown, valid extends boolean = boolean> {
    declare data: valid extends true ? out : never
    declare problems: valid extends true ? never : Problems

    constructor(valid: valid, result: valid extends true ? out : Problems) {
        if (valid) {
            this.data = result as never
        } else {
            this.problems = result as never
        }
    }
}

export class TraversalState {
    basePath = new Path()
    problemsStack: Problems[] = [new Problems()]
    entriesToPrune: [data: Record<string, unknown>, key: string][] = []

    // Qualified
    #seen: { [name in string]?: object[] } = {}

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
            return new CheckResult(false, this.problems)
        }
        for (const [o, k] of this.entriesToPrune) {
            delete o[k]
        }
        return new CheckResult(true, data)
    }

    // TODO: add at custom path

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
}

export type TraversalConfig = {
    [k in keyof TypeConfig]-?: TypeConfig[k][]
}
