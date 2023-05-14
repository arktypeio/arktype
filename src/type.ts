import { CompilationState, In } from "./nodes/compilation.js"
import { registry } from "./nodes/registry.js"
import type { CheckResult } from "./nodes/traverse.js"
import { TraversalState } from "./nodes/traverse.js"
import { type TypeNode } from "./nodes/type.js"
import type { writeUnsatisfiableExpressionError } from "./parse/ast/ast.js"
import type { Morph, ParsedMorph } from "./parse/ast/morph.js"
import type { inferPredicate, Narrow } from "./parse/ast/narrow.js"
import {
    type inferDefinition,
    inferred,
    parseDefinition,
    type validateDefinition
} from "./parse/definition.js"
import type { bind, Scope } from "./scope.js"
import { type Ark } from "./scopes/ark.js"
import { CompiledFunction } from "./utils/compiledFunction.js"
import type { evaluate } from "./utils/generics.js"
import { Path } from "./utils/lists.js"
import type { BuiltinClass } from "./utils/objectKinds.js"

export type TypeParser<$> = {
    // Parse and check the definition, returning either the original input for a
    // valid definition or a string representing an error message.
    <def>(def: validateDefinition<def, bind<$, def>>): parseType<
        def,
        bind<$, def>
    >

    <def>(
        def: validateDefinition<def, bind<$, def>>,
        opts: TypeConfig
    ): parseType<def, bind<$, def>>

    fromValue: <branches extends readonly unknown[]>(
        ...branches: branches
    ) => Type<branches[number], $>
}

// Reuse the validation result to determine if the type will be successfully created.
// If it will, infer it and create a validator. Otherwise, return never.
export type parseType<def, $ extends { this: unknown }> = [def] extends [
    validateDefinition<def, $>
]
    ? Type<$["this"]>
    : never

registry().register("state", TraversalState)

export class Type<t = unknown, $ = Ark> extends CompiledFunction<
    (data: unknown) => CheckResult<inferOut<t>>
> {
    declare [inferred]: t
    declare infer: inferOut<t>
    declare inferIn: inferIn<t>

    root: TypeNode<t>
    allows: this["root"]["allows"]

    constructor(public definition: unknown, public scope: Scope) {
        const root = parseDefinition(definition, {
            path: new Path(),
            scope
        }) as TypeNode<t>
        super(
            In,
            `const state = new ${registry().reference("state")}();
        ${root.compileTraverse(new CompilationState())}
        return state.finalize(${In});`
        )
        this.root = root
        this.allows = root.allows
    }

    private binary(def: unknown, operator: "|" | "&") {
        return new Type([this.definition, operator, def], this.scope)
    }

    and<def>(
        def: validateChainedExpression<
            def,
            bind<$, def>,
            t & inferDefinition<def, bind<$, def>>,
            "intersection"
        >
    ): Type<evaluate<t & inferDefinition<def, bind<$, def>>>>
    and(def: unknown) {
        return this.binary(def, "&")
    }

    or<def>(
        def: validateDefinition<def, bind<$, def>>
    ): Type<t | inferDefinition<def, bind<$, def>>, $>
    or(def: unknown) {
        return this.binary(def, "|")
    }

    morph<def extends Morph<inferOut<t>>>(
        def: def
    ): Type<(In: inferOut<t>) => ReturnType<def>, $>
    morph(def: Morph) {
        return new Type([this.definition, "|>", def], this.scope)
    }

    // TODO: based on below, should maybe narrow morph output if used after
    narrow<def extends Narrow<inferOut<t>>>(
        def: def
    ): Type<inferPredicate<inferOut<t>, def>, $>
    narrow(def: Narrow) {
        return new Type([this.definition, "=>", def], this.scope)
    }

    array(): Type<t[], $>
    array() {
        return new Type([this.definition, "[]"], this.scope)
    }

    keyof(): Type<keyof this["inferIn"], $>
    keyof() {
        return new Type(["keyof", this.definition], this.scope)
    }

    assert(data: unknown): inferOut<t>
    assert(data: unknown) {
        const result = this.call(null, data)
        return result.problems ? result.problems.throw() : result.data
    }

    equals<other>(other: Type<other>): this is Type<other>
    equals(other: Type) {
        return this.root === other.root
    }

    extends<other>(other: Type<other>): this is Type<other>
    extends(other: Type) {
        return this.root.intersect(other.root) === this.root
    }
}

type validateChainedExpression<
    def,
    $,
    inferred,
    operation extends string
> = def extends validateDefinition<def, $>
    ? [inferred] extends [never]
        ? writeUnsatisfiableExpressionError<operation>
        : def
    : validateDefinition<def, $>

export type KeyCheckKind = "loose" | "strict" | "distilled"

export type TypeConfig = evaluate<{
    keys?: KeyCheckKind
    mustBe?: string
}>

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
