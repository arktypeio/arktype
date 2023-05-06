import type { TypeConfig } from "../type.js"
import type { Domain } from "../utils/domains.js"
import type { Segments } from "../utils/lists.js"
import { Path } from "../utils/lists.js"
import type { ProblemCode, ProblemRules } from "./problems.js"

export type TraversalConfig = {
    [k in keyof TypeConfig]-?: TypeConfig[k][]
}

const initializeCompilationConfig = (): TraversalConfig => ({
    mustBe: [],
    keys: []
})

export const In = "$arkRoot"

export const IndexIn = "$arkIndex"

export const prependKey = (path: string, key: string) =>
    `${In}${compilePropAccess(key)}${path.slice(In.length)}`

export const prependIndex = (path: string) =>
    `${In}[${IndexIn}]${path.slice(In.length)}`

export const compilePathAccess = (segments: Segments, root = In) => {
    for (const segment of segments) {
        root += compilePropAccess(segment)
    }
    return root
}

export const compilePropAccess = (key: string | number) => {
    if (typeof key === "number") {
        return `[${key}]`
    }
    return /^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(key)
        ? `.${key}`
        : `[${JSON.stringify(key)}]`
}

export class CompilationState {
    path = new Path()
    lastkind: Domain = "undefined"
    unionDepth = 0
    traversalConfig = initializeCompilationConfig()

    constructor() {}

    get data() {
        return compilePathAccess(this.path)
    }

    problem<code extends ProblemCode>(code: code, rule: ProblemRules[code]) {
        return `${
            this.unionDepth ? "return " : ""
        }state.addProblem("${code}", ${
            typeof rule === "function" ? rule.name : JSON.stringify(rule)
        }, ${this.data}, ${this.path.json})` as const
    }

    ifThen<condition extends string, onTrue extends string>(
        condition: condition,
        onTrue: onTrue
    ) {
        return `if (${condition}) {
            ${onTrue}
        }`
    }

    ifNotThen<condition extends string, onFalse extends string>(
        condition: condition,
        onFalse: onFalse
    ) {
        return `if (!(${condition})) {
            ${onFalse}
        }`
    }
}
