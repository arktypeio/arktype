import { In } from "./compile/compile.js"
import { registry } from "./compile/registry.js"
import type { CheckResult } from "./compile/traverse.js"
import { TraversalState } from "./compile/traverse.js"
import type { TypeNode } from "./nodes/composite/type.js"
import { typeNodeFromValues } from "./nodes/composite/type.js"
import type { inferIntersection } from "./parse/ast/intersections.js"
import type { inferMorphOut, Morph, MorphAst, Out } from "./parse/ast/morph.js"
import type { inferNarrow, Narrow } from "./parse/ast/narrow.js"
import {
    type inferDefinition,
    type inferred,
    parseDefinition,
    type validateDefinition
} from "./parse/definition.js"
import type {
    GenericParamsParseError,
    parseGenericParams
} from "./parse/generic.js"
import type { bindThis, Scope } from "./scope.js"
import type { error } from "../dev/utils/src/errors.js"
import { CompiledFunction } from "../dev/utils/src/functions.js"
import type { conform, id, Literalable } from "../dev/utils/src/generics.js"
import { Path } from "../dev/utils/src/lists.js"

export type TypeParser<$> = TypeOverloads<$> & TypeProps<$>

type TypeOverloads<$> = {
    // Parse and check the definition, returning either the original input for a
    // valid definition or a string representing an error message.
    <def>(def: validateDefinition<def, bindThis<$, def>>): Type<
        inferDefinition<def, bindThis<$, def>>,
        $
    >

    <params extends string, def>(
        params: `<${validateParameterString<params>}>`,
        def: validateDefinition<
            def,
            bindThis<$, def> & {
                [param in parseGenericParams<params>[number]]: unknown
            }
        >
    ): Generic<parseGenericParams<params>, def, bindThis<$, def>>
}

type TypeProps<$> = {
    literal: <branches extends readonly Literalable[]>(
        ...branches: branches
    ) => Type<branches[number], $>
    // TODO: add instance here
}

export const createTypeParser = <$>(scope: Scope): TypeParser<$> => {
    const parser: TypeOverloads<$> = (...args: unknown[]) => {
        return new Type(args[0], scope) as never
    }
    const props: TypeProps<$> = {
        literal: (...branches: readonly unknown[]) =>
            new Type(typeNodeFromValues(branches), scope)
    }
    return Object.assign(parser, props)
}

export type DefinitionParser<$> = <def>(
    def: validateDefinition<def, bindThis<$, def>>
) => def

registry().register("state", TraversalState)

export class Type<t = unknown, $ = any> extends CompiledFunction<
    (data: unknown) => CheckResult<extractOut<t>>
> {
    declare [inferred]: t
    declare infer: extractOut<t>
    declare inferIn: extractIn<t>

    config: TypeConfig
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
        ${root.condition}
        return state.finalize(${In});`
        )
        this.root = root
        this.condition = root.condition
        this.allows = root.allows
        this.config = scope.config
    }

    configure(config: TypeConfig) {
        this.config = { ...this.config, ...config }
        return this
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
        return this.root.extends(other.root)
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

type validateParameterString<params extends string> =
    parseGenericParams<params> extends GenericParamsParseError<infer message>
    ? message
    : params

type bindGenericInstantiationToScope<params extends string[], argDefs, $> = {
    [i in keyof params as params[i & number]]: i extends keyof argDefs
    ? inferDefinition<argDefs[i], bindThis<$, argDefs[i]>>
    : never
} & Omit<$, params[number]>

// Comparing to Generic directly doesn't work well, so we use this similarly to
// the [inferred] symbol for Type
export type GenericProps<
    params extends string[] = string[],
    def = unknown,
    $ = any
> = {
    [id]: "generic"
    $: $
    parameters: params
    definition: def
    scope: Scope
}

export type Generic<
    params extends string[] = string[],
    def = unknown,
    $ = any
> = (<args>(
    /** @ts-expect-error can't constrain this to be an array without breaking narrowing */
    ...args: {
        [i in keyof args]: conform<
            args[i],
            validateDefinition<args[i], bindThis<$, def>>
        >
    }
) => Type<
    inferDefinition<def, bindGenericInstantiationToScope<params, args, $>>,
    $
>) &
    GenericProps<params, def, $>

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
