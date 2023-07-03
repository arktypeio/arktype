import { Path } from "../../dev/utils/src/main.js"
import type { TypeConfig } from "../config.js"
import type { Problem, ProblemCode, ProblemParameters } from "./problems.js"
import { Problems, problemsByCode } from "./problems.js"

export class CheckResult<out = unknown, valid extends boolean = boolean> {
    declare data: valid extends true ? out : never
    declare problems: valid extends true ? never : Problems

    constructor(result: unknown) {
        if ((result as any)?.$arkId === "problems") {
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

    mustBe(mustBe: string, data: unknown, path: Path) {
        return this.addProblem("custom", mustBe, data, path)
    }

    addProblem<code extends ProblemCode>(
        code: code,
        ...args: ProblemParameters<code>
    ) {
        // TODO: fix
        const problem = new problemsByCode[code](
            ...(args as never[])
        ) as any as Problem
        return this.problems.add(problem)
    }
}

export type TraversalConfig = {
    [k in keyof TypeConfig]-?: TypeConfig[k][]
}
