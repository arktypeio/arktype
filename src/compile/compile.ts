import type { Discriminant } from "../nodes/composite/discriminate.js"
import type { BasisNode } from "../nodes/primitive/basis/basis.js"
import type { TypeConfig } from "../type.js"
import { hasDomain } from "../utils/domains.js"
import { throwInternalError } from "../utils/errors.js"
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
    bases: BasisNode[] = []
    discriminants: Discriminant[] = []
    unionDepth = 0
    traversalConfig = initializeCompilationConfig()

    constructor(private kind: "allows" | "traverse") {}

    get data() {
        return compilePathAccess(this.path)
    }

    get lastBasis() {
        return this.bases.at(-1)
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
        const pathString = this.path.join()
        if (
            code === "domain" &&
            rule === "object" &&
            this.discriminants.some((d) => d.path.join().startsWith(pathString))
        ) {
            // if we've already checked a path at least as long as the current one,
            // we don't need to revalidate that we're in an object
            return ""
        }
        if (
            (code === "domain" || code === "value") &&
            this.discriminants.some(
                (d) =>
                    d.path.join() === pathString &&
                    (code === "domain"
                        ? d.kind === "domain" || d.kind === "value"
                        : d.kind === "value")
            )
        ) {
            // if the discriminant has already checked the domain at the current path
            // (or an exact value, implying a domain), we don't need to recheck it
            return ""
        }
        return `if (!(${condition})) {
            ${
                this.kind === "allows"
                    ? "return false"
                    : this.problem(code, rule)
            }
}`
    }
}
