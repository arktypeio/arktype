import { CompilationState, In } from "./nodes/compilation.js"
import { registry } from "./nodes/registry.js"
import type { CheckResult } from "./nodes/traverse.js"
import { TraversalState } from "./nodes/traverse.js"
import type { TypeNode } from "./nodes/type.js"
import type { Filter, inferPredicate } from "./parse/ast/filter.js"
import type { Morph, ParsedMorph } from "./parse/ast/morph.js"
import {
    type inferDefinition,
    inferred,
    parseDefinition,
    type validateDefinition
} from "./parse/definition.js"
import type { bind, Scope } from "./scope.js"
import type { Ark } from "./scopes/ark.js"
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

    equalTo: <value>(value: value) => Type<value, $>
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

    #binary(def: unknown, operator: "|" | "&"): Type<any> {
        return new Type([this.definition, operator, def], this.scope)
    }

    and<def>(
        def: validateDefinition<def, $>
    ): Type<evaluate<t & inferDefinition<def, $>>> {
        return this.#binary(def, "&")
    }

    or<def>(
        def: validateDefinition<def, $>
    ): Type<t | inferDefinition<def, $>, $> {
        return this.#binary(def, "|")
    }

    morph<transform extends Morph<inferOut<t>>>(
        transform: transform
    ): Type<(In: inferOut<t>) => ReturnType<transform>, $> {
        return this as any
    }

    equals<other>(other: Type<other>): this is Type<other> {
        return this.root === (other.root as unknown)
    }

    extends<other>(other: Type<other>): this is Type<other> {
        return this.root.intersect(other.root) === this.root
    }

    // TODO: based on below, should maybe filter morph output if used after
    filter<predicate extends Filter<inferOut<t>>>(
        predicate: predicate
    ): Type<inferPredicate<inferOut<t>, predicate>, $> {
        return new Type(this.root.constrain("filter", predicate), this.scope)
    }

    array(): Type<t[], $> {
        return new Type([this.definition, "[]"], this.scope)
    }

    keyof(): Type<keyof t, $> {
        return new Type(["keyof", this.definition], this.scope)
    }

    assert(data: unknown): inferOut<t> {
        const result = this.call(null, data)
        return result.problems ? result.problems.throw() : result.data
    }
}

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
