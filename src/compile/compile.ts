import type { NodeKind } from "../nodes/kinds.js"
import type { TypeConfig } from "../type.js"
import { type Domain, hasDomain } from "../utils/domains.js"
import { Path } from "../utils/lists.js"
import type { SerializablePrimitive } from "../utils/serialize.js"
import { serializePrimitive } from "../utils/serialize.js"
import type { ProblemCode, ProblemRules } from "./problems.js"
import { registry } from "./registry.js"

export const precedenceByKind = {
    // roots
    type: 0,
    predicate: 0,
    // basis checks
    domain: 1,
    class: 1,
    value: 1,
    // shallow checks
    range: 2,
    divisor: 2,
    regex: 2,
    // deep checks
    props: 3,
    // narrows
    narrow: 4,
    // morphs
    morph: 5
} as const satisfies Record<NodeKind, number>

export type TraversalConfig = {
    [k in keyof TypeConfig]-?: TypeConfig[k][]
}

const initializeCompilationConfig = (): TraversalConfig => ({
    mustBe: [],
    keys: []
})

export const In = "$arkRoot"

export const IndexIn = "$arkIndex"

export const KeyIn = "$arkKey"

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
        ? registry().register(typeof value, value)
        : serializePrimitive(value as SerializablePrimitive)
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
            typeof rule === "function"
                ? rule.name
                : // TODO: Fix
                  compileSerializedValue(rule)
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
