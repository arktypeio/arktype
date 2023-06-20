/* eslint-disable @typescript-eslint/no-unused-vars */
import type { error } from "../dev/utils/src/errors.js"
import { CompiledFunction } from "../dev/utils/src/functions.js"
import type { conform, Literalable } from "../dev/utils/src/generics.js"
import type {
    AbstractableConstructor,
    BuiltinObjectKind,
    BuiltinObjects
} from "../dev/utils/src/objectKinds.js"
import { arkKind, registry } from "./compile/registry.js"
import { CompilationState, InputParameterName } from "./compile/state.js"
import type { CheckResult } from "./compile/traverse.js"
import { TraversalState } from "./compile/traverse.js"
import type { PredicateInput } from "./nodes/composite/predicate.js"
import type { TypeNode } from "./nodes/composite/type.js"
import { node } from "./nodes/composite/type.js"
import type { inferIntersection } from "./parse/ast/intersections.js"
import type {
    inferDefinition,
    validateDeclared,
    validateDefinition
} from "./parse/definition.js"
import { inferred } from "./parse/definition.js"
import type { GenericParamsParseError } from "./parse/generic.js"
import { parseGenericParams } from "./parse/generic.js"
import type {
    IndexOneOperator,
    IndexZeroOperator,
    inferMorphOut,
    inferNarrow,
    Morph,
    MorphAst,
    Narrow,
    Out,
    TupleInfixOperator
} from "./parse/tuple.js"
import type { Scope } from "./scope.js"
import { bindThis } from "./scope.js"

export type TypeParser<$> = TypeOverloads<$> & TypeProps<$>

type TypeOverloads<$> = {
    // Parse and check the definition, returning either the original input for a
    // valid definition or a string representing an error message.
    <def>(def: validateTypeRoot<def, $>): Type<inferTypeRoot<def, $>, $>

    // Spread version of a tuple expression
    <zero, one, two>(
        expression0: zero extends IndexZeroOperator
            ? zero
            : validateDefinition<
                  zero,
                  $,
                  bindThis<tupleExpression<zero, one, two>>
              >,
        expression1: zero extends IndexZeroOperator
            ? validateDefinition<
                  one,
                  $,
                  bindThis<tupleExpression<zero, one, two>>
              >
            : conform<one, IndexOneOperator>,
        ...expression2: one extends TupleInfixOperator
            ? [
                  one extends ":"
                      ? Narrow<
                            extractIn<
                                inferDefinition<
                                    zero,
                                    $,
                                    bindThis<tupleExpression<zero, one, two>>
                                >
                            >
                        >
                      : one extends "=>"
                      ? // TODO: centralize
                        Morph<
                            extractOut<
                                inferDefinition<
                                    zero,
                                    $,
                                    bindThis<tupleExpression<zero, one, two>>
                                >
                            >,
                            unknown
                        >
                      : validateDefinition<
                            two,
                            $,
                            bindThis<tupleExpression<zero, one, two>>
                        >
              ]
            : []
    ): Type<
        inferDefinition<
            tupleExpression<zero, one, two>,
            $,
            bindThis<tupleExpression<zero, one, two>>
        >,
        $
    >

    <params extends string, def>(
        params: `<${validateParameterString<params>}>`,
        def: validateDefinition<
            def,
            $,
            {
                [param in parseGenericParams<params>[number]]: unknown
            }
        >
    ): Generic<parseGenericParams<params>, def, $>
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
        def: validateDeclared<preinferred, def, $, bindThis<def>>
    ) => Type<inferDefinition<def, $, bindThis<def>>, $>
}

type TypeArgs =
    | [def: unknown]
    | [expression0: unknown, expression1: unknown, expression2?: unknown]
    | [params: `<${string}>`, def: unknown]

export const createTypeParser = <$>(scope: Scope): TypeParser<$> => {
    const parser: TypeOverloads<$> = (...args: unknown[]) => {
        if (args.length === 1) {
            // treat as a simple definition
            return new Type(args[0], scope) as never
        }
        if (
            args.length === 2 &&
            typeof args[0] === "string" &&
            args[0][0] === "<" &&
            args[0].at(-1) === ">"
        ) {
            // if there are exactly two args, the first of which looks like <${string}>,
            // treat as a generic
            return generic(
                parseGenericParams(args[0].slice(1, -1)),
                args[1],
                scope
            ) as never
        }
        // otherwise, treat as a tuple expression. technically, this also allows
        // non-expression tuple definitions to be parsed, but it's not a support
        // part of the API as specified by the associated types
        return new Type(args, scope) as never
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
    def: validateDefinition<def, $, bindThis<def>>
) => def

registry().registerInternal("state", TraversalState)

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
        const root = parseTypeRoot(definition, scope) as TypeNode<t>
        super(
            InputParameterName,
            `const state = new ${registry().reference("state")}();
        ${root.compile(new CompilationState("traverse"))}
        return state.finalize(${InputParameterName});`
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
            $,
            inferIntersection<t, inferTypeRoot<def, $>>
        >
    ): Type<inferIntersection<t, inferTypeRoot<def, $>>, $> {
        return new Type(
            this.root.and(parseTypeRoot(def, this.scope)),
            this.scope
        ) as never
    }

    or<def>(def: validateTypeRoot<def, $>): Type<t | inferTypeRoot<def, $>, $> {
        return new Type(
            this.root.or(parseTypeRoot(def, this.scope)),
            this.scope
        ) as never
    }

    morph<morph extends Morph<extractOut<t>>>(
        morph: morph
    ): Type<(In: this["inferIn"]) => Out<inferMorphOut<ReturnType<morph>>>, $>
    morph<morph extends Morph<extractOut<t>>, def>(
        morph: morph,
        outValidator: validateTypeRoot<def, $>
    ): Type<
        (In: this["inferIn"]) => Out<
            // TODO: validate overlapping
            // inferMorphOut<ReturnType<morph>> &
            extractOut<inferTypeRoot<def, $>>
        >,
        $
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

    equals<other>(other: Type<other>): this is Type<other, $> {
        return this.root === (other.root as unknown)
    }

    extends<other>(other: Type<other>): this is Type<other, $> {
        return this.root.extends(other.root)
    }
}

const parseTypeRoot = (def: unknown, scope: Scope, args?: BoundArgs) =>
    scope.parseRoot(def, args ?? bindThis())

export type validateTypeRoot<def, $> = validateDefinition<def, $, bindThis<def>>

export type inferTypeRoot<def, $> = inferDefinition<def, $, bindThis<def>>

type validateChainedExpression<def, $, inferred> = def extends validateTypeRoot<
    def,
    $
>
    ? // As of TS 5.1, trying to infer the message here directly breaks everything
      inferred extends error
        ? inferred
        : def
    : validateTypeRoot<def, $>

type validateParameterString<params extends string> =
    parseGenericParams<params> extends GenericParamsParseError<infer message>
        ? message
        : params

export const generic = (
    parameters: string[],
    definition: unknown,
    scope: Scope
) =>
    Object.assign(
        (...args: unknown[]) => {
            const argNodes = Object.fromEntries(
                parameters.map((param, i) => [
                    param,
                    parseTypeRoot(args[i], scope)
                ])
            )
            const root = parseTypeRoot(definition, scope, argNodes)
            return new Type(root, scope)
        },
        {
            [arkKind]: "generic",
            // TODO: remove at runtime
            $: undefined,
            parameters,
            definition,
            scope
        } satisfies GenericProps
    )

// Comparing to Generic directly doesn't work well, so we compare to only its props
export type GenericProps<
    params extends string[] = string[],
    def = unknown,
    $ = any
> = {
    [arkKind]: "generic"
    $: $
    parameters: params
    definition: def
    scope: Scope
}

export type BoundArgs = Record<string, TypeNode>

// TODO: Fix external reference (i.e. if this is attached to a scope, then args are defined using it)
export type Generic<
    params extends string[] = string[],
    def = unknown,
    $ = any
> = (<args>(
    ...args: conform<
        args,
        {
            [i in keyof params]: validateTypeRoot<args[i & keyof args], $>
        }
    >
) => Type<
    inferDefinition<def, $, bindGenericInstantiation<params, $, args>>,
    $
>) &
    GenericProps<params, def, $>

type bindGenericInstantiation<params extends string[], $, args> = {
    [i in keyof params & `${number}` as params[i]]: inferTypeRoot<
        args[i & keyof args],
        $
    >
}

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
    ? t extends TerminallyInferredObjectKind
        ? t
        : { [k in keyof t]: extractMorphs<t[k], io> }
    : t

/** Objects we don't want to expand during inference like Date or Promise */
type TerminallyInferredObjectKind = BuiltinObjects[Exclude<
    BuiltinObjectKind,
    "Object" | "Array"
>]
