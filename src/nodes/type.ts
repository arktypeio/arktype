import type { ParsedMorph } from "../parse/ast/morph.ts"
import {
    type inferDefinition,
    parseDefinition,
    type validateDefinition
} from "../parse/definition.ts"
import type { evaluate } from "../utils/generics.ts"
import type { BuiltinClass } from "../utils/objectKinds.ts"
import type { Constraints } from "./constraints.ts"
import type { ComparisonState, CompilationState } from "./node.ts"
import { Node } from "./node.ts"
import type { Union } from "./union.ts"

export type TypeParser<$> = {
    // Parse and check the definition, returning either the original input for a
    // valid definition or a string representing an error message.
    <def>(def: validateDefinition<def, $>): parseType<def, $>

    <def>(def: validateDefinition<def, $>, opts: TypeOptions): parseType<def, $>
}

// Reuse the validation result to determine if the type will be successfully created.
// If it will, infer it and create a validator. Otherwise, return never.
export type parseType<def, $> = [def] extends [validateDefinition<def, $>]
    ? Type<inferDefinition<def, $>>
    : never

export type TypeRule = Union | Constraints

export class Type<t = unknown> extends Node<typeof Type, t> {
    constructor(public definition: unknown) {
        // TODO; fix
        const rule = parseDefinition(definition, {} as never)
        super(Type, rule)
    }

    static intersect(l: Type, r: Type, s: ComparisonState) {
        return l ?? r
    }

    static compile(rule: TypeRule, s: CompilationState) {
        return rule.compile(s)
    }
}

export type KeyCheckKind = "loose" | "strict" | "distilled"

export type TypeOptions = evaluate<{
    keys?: KeyCheckKind
    mustBe?: string
}>

export type TypeConfig = TypeOptions

export type inferIn<t> = inferMorphs<t, "in">

export type inferOut<t> = inferMorphs<t, "out">

type inferMorphs<t, io extends "in" | "out"> = t extends ParsedMorph<
    infer i,
    infer o
>
    ? io extends "in"
        ? i
        : o
    : t extends object
    ? t extends BuiltinClass | ((...args: any[]) => any)
        ? t
        : { [k in keyof t]: inferMorphs<t[k], io> }
    : t
