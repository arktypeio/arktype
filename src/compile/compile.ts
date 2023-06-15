import type { TypeConfig } from "../type.js"
import { type Domain, hasDomain } from "../utils/domains.js"
import { Path } from "../utils/lists.js"
import type { SerializablePrimitive } from "../utils/serialize.js"
import { serializePrimitive } from "../utils/serialize.js"
import type { ProblemCode, ProblemRules } from "./problems.js"
import { registry } from "./registry.js"

export type TraversalConfig = {
    [k in keyof TypeConfig]-?: TypeConfig[k][]
}

const initializeCompilationConfig = (): TraversalConfig => ({
    mustBe: [],
    keys: []
})

export const In = "$arkRoot"

const IndexIn = "$arkIndex"

const KeyIn = "$arkKey"

export const prependIndex = (path: string) =>
    `${In}[${IndexIn}]${path.slice(In.length)}`

export type CompilePathAccessOptions = {
    root?: string
    optional?: boolean
}

export const compilePathAccess = (
    segments: string[],
    opts?: CompilePathAccessOptions
) => {
    let result = opts?.root ?? In
    for (const segment of segments) {
        result += compilePropAccess(segment, opts?.optional)
    }
    return result
}

export const compilePropAccess = (key: string, optional = false) => {
    return /^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(key)
        ? `${optional ? "?" : ""}.${key}`
        : `${optional ? "?." : ""}[${JSON.stringify(key)}]`
}

export const compileSerializedValue = (value: unknown) => {
    return hasDomain(value, "object") || typeof value === "symbol"
        ? registry().register("value", typeof value, value)
        : serializePrimitive(value as SerializablePrimitive)
}

export class CompilationState {
    path = new Path()
    lastkind: Domain = "undefined"
    unionDepth = 0
    traversalConfig = initializeCompilationConfig()

    constructor(private kind: "allows" | "traverse") {}

    get data() {
        return compilePathAccess(this.path)
    }

    problem<code extends ProblemCode>(code: code, rule: ProblemRules[code]) {
        return `${
            this.unionDepth ? "return " : ""
        }state.addProblem("${code}", ${
            typeof rule === "function"
                ? rule.name
                : // TODO: Fix
                  compileSerializedValue(rule)
        }, ${this.data}, ${this.path.json})` as const
    }

    check<code extends ProblemCode>(
        code: code,
        rule: ProblemRules[code],
        condition: string
    ) {
        return `if (!(${condition})) {
            ${
                this.kind === "allows"
                    ? "return false"
                    : this.problem(code, rule)
            }
        }`
    }
}
