import { In } from "./compile/compile.js"
import { registry } from "./compile/registry.js"
import type { CheckResult } from "./compile/traverse.js"
import { TraversalState } from "./compile/traverse.js"
import type { PredicateInput } from "./nodes/composite/predicate.js"
import type { TypeNode } from "./nodes/composite/type.js"
import { node } from "./nodes/composite/type.js"
import type { inferIntersection } from "./parse/ast/intersections.js"
import type { inferMorphOut, Morph, MorphAst, Out } from "./parse/ast/morph.js"
import type { inferNarrow, Narrow } from "./parse/ast/narrow.js"
import type {
    IndexOneOperator,
    IndexZeroOperator,
    TupleInfixOperator,
    validateTupleLiteral
} from "./parse/ast/tuple.js"
import type {
    inferDefinition,
    validateDeclared,
    validateDefinition
} from "./parse/definition.js"
import { inferred } from "./parse/definition.js"
import type {
    GenericParamsParseError,
    parseGenericParams
} from "./parse/generic.js"
import type { bindThis, Scope } from "./scope.js"
import type { Ark } from "./scopes/ark.js"
import type { error } from "./utils/errors.js"
import { CompiledFunction } from "./utils/functions.js"
import type { asConst, conform, id, Literalable } from "./utils/generics.js"
import { List } from "./utils/lists.js"
import type { AbstractableConstructor } from "./utils/objectKinds.js"

export type TypeParser<$> = TypeOverloads<$> & TypeProps<$>

type TypeOverloads<$> = {
    // Parse and check the definition, returning either the original input for a
    // valid definition or a string representing an error message.
    <def>(def: validateDefinition<def, bindThis<$, def>>): Type<
        inferDefinition<def, bindThis<$, def>>,
        $
    >

    // TODO: this type within expression?
    // Spread version of a tuple expression
    <zero, one, two>(
        expression0: zero extends IndexZeroOperator
            ? zero
            : validateDefinition<zero, bindThis<$, zero>>,
        expression1: zero extends IndexZeroOperator
            ? validateDefinition<one, bindThis<$, one>>
            : conform<one, IndexOneOperator>,
        ...expression2: one extends TupleInfixOperator
            ? [
                  one extends ":"
                      ? Narrow<extractIn<inferDefinition<zero, $>>>
                      : one extends "=>"
                      ? // TODO: centralize
                        Morph<extractOut<inferDefinition<zero, $>>, unknown>
                      : validateDefinition<two, bindThis<$, two>>
              ]
            : []
    ): Type<
        inferDefinition<
            tupleExpression<zero, one, two>,
            bindThis<$, tupleExpression<zero, one, two>>
        >,
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

type tupleExpression<zero, one, two> = one extends TupleInfixOperator
    ? [zero, one, two]
    : [zero, one]

type TypeProps<$> = {
    literal: <branches extends readonly Literalable[]>(
        ...possibleValues: branches
    ) => Type<branches[number], $>
    instanceof: <branches extends readonly AbstractableConstructor[]>(
        ...possibleConstructors: branches
    ) => Type<InstanceType<branches[number]>, $>
}

export type DeclarationParser<$> = <preinferred>() => {
    type: <def>(
        def: validateDeclared<preinferred, def, bindThis<$, def>>
    ) => Type<inferDefinition<def, bindThis<$, def>>, $>
}

export const createTypeParser = <$>(scope: Scope): TypeParser<$> => {
    const parser: TypeOverloads<$> = (...args: unknown[]) => {
        return new Type(args[0], scope) as never
    }
    const props: TypeProps<$> = {
        literal: (...possibleValues) =>
            new Type(node.literal(...possibleValues), scope),
        instanceof: (...possibleConstructors) =>
            new Type(
                node(
                    ...possibleConstructors.map(
                        (ctor): PredicateInput => ({ basis: ctor })
                    )
                ),
                scope
            )
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
        const root = scope.parseTypeRoot(definition) as TypeNode<t>
        super(
            In,
            `${root.condition}
        return true`
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
        return new Type(
            this.root.and(this.scope.parseTypeRoot(def)),
            this.scope
        ) as never
    }

    or<def>(
        def: validateDefinition<def, bindThis<$, def>>
    ): Type<t | inferDefinition<def, bindThis<$, def>>, $> {
        return new Type(
            this.root.or(this.scope.parseTypeRoot(def)),
            this.scope
        ) as never
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
        // TODO: tuple expression for out validator
        outValidator
        return new Type(
            this.root.constrain("morph", morph),
            this.scope
        ) as never
    }

    // TODO: based on below, should maybe narrow morph output if used after
    narrow<def extends Narrow<extractOut<t>>>(
        def: def
    ): Type<inferNarrow<extractOut<t>, def>, $> {
        return new Type(this.root.constrain("narrow", def), this.scope) as never
    }

    array(): Type<t[], $> {
        return new Type(this.root.array(), this.scope) as never
    }

    keyof(): Type<keyof this["inferIn"], $> {
        return new Type(this.root.keyof(), this.scope) as never
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
