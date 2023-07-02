import type { SerializablePrimitive } from "../../dev/utils/src/main.js"
import {
    hasDomain,
    isArray,
    serializePrimitive
} from "../../dev/utils/src/main.js"
import type { Discriminant } from "../nodes/composite/discriminate.js"
import type { BasisNode } from "../nodes/primitive/basis/basis.js"
import type { ProblemCode, ProblemRules } from "./problems.js"
import { registry } from "./registry.js"

export const InputParameterName = "$arkRoot"

export class CompilationState {
    private path: CompiledPathSegment[] = []
    bases: BasisNode[] = []
    discriminants: Discriminant[] = []

    constructor(public readonly kind: "allows" | "traverse") {}

    get data() {
        let result = InputParameterName
        for (const k of this.path) {
            if (typeof k === "string") {
                result += compilePropAccess(k)
            } else {
                result += `[${k[0]}]`
            }
        }
        return result
    }

    private getNextIndex(prefix: IndexVariablePrefix) {
        let name: IndexVariableName = prefix
        let suffix = 2
        for (const k of this.path) {
            if (isArray(k) && k[0].startsWith(prefix)) {
                name = `${prefix}${suffix++}`
            }
        }
        return name
    }

    get lastBasis() {
        return this.bases.at(-1)
    }

    pushNamedKey(name: string) {
        this.path.push(name)
    }

    getNextIndexKeyAndPush(prefix: IndexVariablePrefix) {
        const k = this.getNextIndex(prefix)
        this.path.push([k])
        return k
    }

    popKey() {
        return this.path.pop()
    }

    problem<code extends ProblemCode>(code: code, rule: ProblemRules[code]) {
        return `state.addProblem("${code}", ${compileSerializedValue(rule)}, ${
            this.data
        }, [${this.path.map((segment) =>
            // if the segment is a variable reference, don't quote it
            typeof segment === "string" ? JSON.stringify(segment) : segment[0]
        )}])` as const
    }

    invalid<code extends ProblemCode>(code: code, rule: ProblemRules[code]) {
        return this.kind === "allows"
            ? "return false"
            : this.problem(code, rule)
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
            ${this.invalid(code, rule)}
}`
    }
}

type CompiledPathSegment = string | [IndexVariableName]

type IndexVariablePrefix = "i" | "k"

type IndexVariableName = `${IndexVariablePrefix}${"" | number}`

export const compileSerializedValue = (value: unknown) => {
    if (
        (hasDomain(value, "object") || typeof value === "symbol") &&
        !(value instanceof Date)
    ) {
        return registry().register(value)
    }
    const modifiedValue = value instanceof Date ? value.valueOf() : value
    return serializePrimitive(modifiedValue as SerializablePrimitive)
}

export const isDotAccessible = (name: string) =>
    /^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(name)

export const compilePropAccess = (name: string, optional = false) =>
    isDotAccessible(name)
        ? `${optional ? "?" : ""}.${name}`
        : `${optional ? "?." : ""}[${JSON.stringify(name)}]`
