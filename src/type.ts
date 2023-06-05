import { CompilationState, In } from "./nodes/compilation.js"
import { registry } from "./nodes/registry.js"
import type { CheckResult } from "./nodes/traverse.js"
import { TraversalState } from "./nodes/traverse.js"
import { type TypeNode } from "./nodes/type.js"
import type { inferIntersection } from "./parse/ast/intersections.js"
import type { inferMorphOut, Morph, MorphAst, Out } from "./parse/ast/morph.js"
import type { inferNarrow, Narrow } from "./parse/ast/narrow.js"
import {
    type inferDefinition,
    inferred,
    parseDefinition,
    type validateDefinition
} from "./parse/definition.js"
import type { bindThis, Scope } from "./scope.js"
import { type Ark } from "./scopes/ark.js"
import type { error } from "./utils/errors.js"
import { CompiledFunction } from "./utils/functions.js"
import { Path } from "./utils/lists.js"

export type TypeParser<$> = {
    // Parse and check the definition, returning either the original input for a
    // valid definition or a string representing an error message.
    <def>(def: validateDefinition<def, bindThis<$, def>>): Type<
        inferDefinition<def, bindThis<$, def>>,
        $
    >

    <def>(
        def: validateDefinition<def, bindThis<$, def>>,
        opts: TypeConfig
    ): Type<inferDefinition<def, bindThis<$, def>>, $>

    exactly: <branches extends readonly unknown[]>(
        ...branches: branches
    ) => Type<branches[number], $>
}

export type DefinitionParser<$> = <def>(
    def: validateDefinition<def, bindThis<$, def>>
) => def

registry().register("state", TraversalState)

export class Generic<
    params extends string[] = string[],
    def = unknown,
    $ = Ark
> extends CompiledFunction<
    <args extends unknown[]>(
        ...args: { [i in keyof params]: args[i & number] }
    ) => Type<args, $>
> {
    constructor(
        public params: params,
        public definition: def,
        public scope: Scope
    ) {
        super()
    }
}

export class Type<t = unknown, $ = Ark> extends CompiledFunction<
    (data: unknown) => CheckResult<extractOut<t>>
> {
    declare [inferred]: t
    declare infer: extractOut<t>
    declare inferIn: extractIn<t>

    root: TypeNode<t>
    condition: string
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
        this.condition = root.condition
        this.allows = root.allows
    }

    // TODO: should return out
    from(literal: this["infer"]) {
        return literal
    }

    fromIn(literal: this["inferIn"]) {
        return literal
    }

    // TODO: Morph intersections, ordering
    and<def>(
        def: validateChainedExpression<
            def,
            bindThis<$, def>,
            inferIntersection<t, inferDefinition<def, bindThis<$, def>>>
        >
    ): Type<inferIntersection<t, inferDefinition<def, bindThis<$, def>>>> {
        return this.binary(def, "&") as never
    }

    or<def>(
        def: validateDefinition<def, bindThis<$, def>>
    ): Type<t | inferDefinition<def, bindThis<$, def>>, $> {
        return this.binary(def, "|") as never
    }

    morph<morph extends Morph<extractOut<t>>>(
        morph: morph
    ): Type<(In: this["inferIn"]) => Out<inferMorphOut<ReturnType<morph>>>>
    morph<morph extends Morph<extractOut<t>>, def>(
        morph: morph,
        outValidator: validateDefinition<def, bindThis<$, def>>
    ): Type<
        (In: this["inferIn"]) => Out<
            // TODO: validate overlapping
            // inferMorphOut<ReturnType<morph>> &
            extractOut<inferDefinition<def, bindThis<$, def>>>
        >
    >
    morph(morph: Morph, outValidator?: unknown) {
        // TODO: tuple expression
        outValidator
        return new Type([this.definition, "|>", morph], this.scope) as never
    }

    // TODO: based on below, should maybe narrow morph output if used after
    narrow<def extends Narrow<extractOut<t>>>(
        def: def
    ): Type<inferNarrow<extractOut<t>, def>, $> {
        return new Type([this.definition, "=>", def], this.scope) as never
    }

    array(): Type<t[], $> {
        return new Type([this.definition, "[]"], this.scope) as never
    }

    keyof(): Type<keyof this["inferIn"], $> {
        return new Type(["keyof", this.definition], this.scope) as never
    }

    assert(data: unknown): extractOut<t> {
        const result = this.call(null, data)
        return result.problems ? result.problems.throw() : result.data
    }

    equals<other>(other: Type<other>): this is Type<other> {
        return this.root === (other.root as unknown)
    }

    extends<other>(other: Type<other>): this is Type<other> {
        return this.root.intersect(other.root) === this.root
    }

    private binary(def: unknown, operator: "|" | "&") {
        return new Type([this.definition, operator, def], this.scope)
    }
}

type validateChainedExpression<def, $, inferred> =
    def extends validateDefinition<def, $>
        ? // As of TS 5.1, trying to infer the message here directly breaks everything
          inferred extends error
            ? inferred
            : def
        : validateDefinition<def, $>

export type KeyCheckKind = "loose" | "strict" | "distilled"

export type TypeConfig = {
    keys?: KeyCheckKind
    mustBe?: string
}

export type extractIn<t> = extractMorphs<t, "in">

export type extractOut<t> = extractMorphs<t, "out">

type extractMorphs<t, io extends "in" | "out"> = t extends MorphAst<
    infer i,
    infer o
>
    ? io extends "in"
        ? i
        : o
    : t extends object
    ? t extends
          | ((...args: never[]) => unknown)
          | (abstract new (...args: never[]) => unknown)
        ? t
        : { [k in keyof t]: extractMorphs<t[k], io> }
    : t
