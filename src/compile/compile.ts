import type { SerializablePrimitive } from "../../dev/utils/src/main.js"
import { hasDomain, serializePrimitive } from "../../dev/utils/src/main.js"
import type { Discriminant } from "../nodes/composite/discriminate.js"
import type { BasisNode } from "../nodes/primitive/basis/basis.js"
import type { ProblemCode, ProblemRules } from "./problems.js"
import { registry } from "./registry.js"

export const InputParameterName = "$arkRoot"

export type CompiledSuccessKind = "true" | "in" | "out"
export type CompiledFailureKind = "false" | "problems"

export type CompilationContext = {
    successKind: CompiledSuccessKind
    failureKind: CompiledFailureKind
    path: CompiledPathSegment[]
    discriminants: Discriminant[]
    bases: BasisNode[]
}

export const createCompilationContext = (
    successKind: CompiledSuccessKind,
    failureKind: CompiledFailureKind
): CompilationContext => ({
    successKind,
    failureKind,
    path: [],
    discriminants: [],
    bases: []
})

const compileAddProblem = <code extends ProblemCode>(
    code: code,
    rule: ProblemRules[code],
    ctx: CompilationContext
) => {
    return `state.addProblem("${code}", ${compileSerializedValue(
        rule
    )}, ${InputParameterName}, [${ctx.path.map((segment) =>
        // if the segment is a variable reference, don't quote it
        typeof segment === "string" ? JSON.stringify(segment) : segment[0]
    )}])` as const
}

export const compileFailureResult = <code extends ProblemCode>(
    code: code,
    rule: ProblemRules[code],
    ctx: CompilationContext
) => {
    return ctx.failureKind === "false"
        ? "return false"
        : compileAddProblem(code, rule, ctx)
}

export const compileCheck = <code extends ProblemCode>(
    code: code,
    rule: ProblemRules[code],
    condition: string,
    ctx: CompilationContext
) => {
    const pathString = ctx.path.join()
    if (
        code === "domain" &&
        rule === "object" &&
        ctx.discriminants.some((d) => d.path.join().startsWith(pathString))
    ) {
        // if we've already checked a path at least as long as the current one,
        // we don't need to revalidate that we're in an object
        return ""
    }
    if (
        (code === "domain" || code === "value") &&
        ctx.discriminants.some(
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
        ${compileFailureResult(code, rule, ctx)}
}`
}

type CompiledPathSegment = string | [IndexVariableName]

type IndexVariablePrefix = "i" | "k"

type IndexVariableName = `${IndexVariablePrefix}${"" | number}`

export const compileSerializedValue = (value: unknown) => {
    return hasDomain(value, "object") || typeof value === "symbol"
        ? registry().register(value)
        : serializePrimitive(value as SerializablePrimitive)
}

export const isDotAccessible = (name: string) =>
    /^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(name)

export const compilePropAccess = (name: string, optional = false) =>
    isDotAccessible(name)
        ? `${optional ? "?" : ""}.${name}`
        : `${optional ? "?." : ""}[${JSON.stringify(name)}]`
