import type {
    AbstractableConstructor,
    BuiltinObjectKind,
    BuiltinObjects,
    conform,
    NonEmptyList,
    Primitive
} from "../dev/utils/src/main.js"
import { CompiledFunction, transform } from "../dev/utils/src/main.js"
import { arkKind, registry } from "./compile/registry.js"
import { CompilationState, InputParameterName } from "./compile/state.js"
import type { CheckResult } from "./compile/traverse.js"
import { TraversalState } from "./compile/traverse.js"
import type { TypeNode } from "./nodes/composite/type.js"
import { builtins } from "./nodes/composite/type.js"
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
    inferMorphOut,
    inferNarrow,
    Morph,
    MorphAst,
    Narrow,
    Out
} from "./parse/tuple.js"
import type { Scope } from "./scope.js"
import { bindThis } from "./scope.js"

export type TypeParser<$> = {
    // Parse and check the definition, returning either the original input for a
    // valid definition or a string representing an error message.
    <const def>(def: validateTypeRoot<def, $>): Type<inferTypeRoot<def, $>, $>

    // For prefix operators ("keyof", "instanceof", "==="), storing the token
    // associated with the overload as a generic constraint helps TS
    // disambiguate signatures and avoids breaking autocompletion within object
    // definitions
    <token extends "keyof", const def>(
        _: token,
        def: validateTypeRoot<def, $>
    ): Type<keyof inferTypeRoot<def, $>, $>

    <
        token extends "instanceof",
        const constructors extends NonEmptyList<AbstractableConstructor>
    >(
        _: token,
        ...oneOf: constructors
    ): Type<InstanceType<constructors[number]>, $>

    <token extends "===", const values extends NonEmptyList>(
        _: token,
        ...oneOf: values
    ): Type<values[number], $>

    // // TODO: ensure consistent `this` usage
    <const def, narrow extends Narrow<extractIn<inferTypeRoot<def, $>>>>(
        def: validateTypeRoot<def, $>,
        _: ":",
        narrow: narrow
    ): Type<inferNarrow<inferTypeRoot<def, $>, narrow>, $>

    <const def, morph extends Morph<extractOut<inferTypeRoot<def, $>>>>(
        def: validateTypeRoot<def, $>,
        _: "=>",
        morph: morph
    ): Type<
        // TODO: Ensure consistent
        (
            In: extractIn<inferTypeRoot<def, $>>
        ) => Out<inferMorphOut<ReturnType<morph>>>,
        $
    >

    <const l, const r>(
        l: validateTypeRoot<l, $>,
        _: "&",
        r: validateTypeRoot<r, $>
    ): Type<inferIntersection<inferTypeRoot<l, $>, inferTypeRoot<r, $>>, $>

    <const l, const r>(
        l: validateTypeRoot<l, $>,
        _: "|",
        r: validateTypeRoot<r, $>
    ): Type<inferTypeRoot<l, $> | inferTypeRoot<r, $>, $>

    <const def>(def: validateTypeRoot<def, $>, _: "[]"): Type<
        inferTypeRoot<def, $>[],
        $
    >

    <params extends string, const def>(
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

export type DeclarationParser<$> = <preinferred>() => {
    // for some reason, making this a const parameter breaks preinferred validation
    type: <def>(
        def: validateDeclared<preinferred, def, $, bindThis<def>>
    ) => Type<preinferred, $>
}

export const createTypeParser = <$>(scope: Scope): TypeParser<$> => {
    const parser = (...args: unknown[]): Type | Generic => {
        if (args.length === 1) {
            // treat as a simple definition
            return new Type(args[0], scope)
        }
        if (
            args.length === 2 &&
            typeof args[0] === "string" &&
            args[0][0] === "<" &&
            args[0].at(-1) === ">"
        ) {
            // if there are exactly two args, the first of which looks like <${string}>,
            // treat as a generic
            const params = parseGenericParams(args[0].slice(1, -1))
            const def = args[1]
            return validateUninstantiatedGeneric(
                generic(params, def, scope) as never
            )
        }
        // otherwise, treat as a tuple expression. technically, this also allows
        // non-expression tuple definitions to be parsed, but it's not a supported
        // part of the API as specified by the associated types
        return new Type(args, scope)
    }
    return parser as never
}

export type DefinitionParser<$> = <const def>(
    def: validateDefinition<def, $, bindThis<def>>
) => def

registry().registerInternal("state", TraversalState)

// TODO:  require scope be passed to type?
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
        def: validateTypeRoot<def, $>
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

type validateParameterString<params extends string> =
    parseGenericParams<params> extends GenericParamsParseError<infer message>
        ? message
        : params

export const validateUninstantiatedGeneric = (g: Generic) => {
    // the unconstrained instantiation of the generic is not used for now
    // other than to eagerly validate that the def does not contain any errors
    g.scope.parseRoot(
        g.definition,
        Object.fromEntries(
            // once we support constraints on generic parameters, we'd use
            // the base type here: https://github.com/arktypeio/arktype/issues/796
            g.parameters.map((name) => [name, builtins.unknown()])
        )
    )
    return g
}

export const generic = (
    parameters: string[],
    definition: unknown,
    scope: Scope
) => {
    return Object.assign(
        (...args: unknown[]) => {
            const argNodes = transform(parameters, ([i, param]) => [
                param,
                parseTypeRoot(args[i], scope)
            ])
            const root = parseTypeRoot(definition, scope, argNodes)
            return new Type(root, scope)
        },
        {
            [arkKind]: "generic",
            parameters,
            definition,
            scope
        } satisfies Omit<GenericProps, "$">
    ) as unknown as Generic
}

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

export type extractIn<t> = extractMorphs<t, "in"> extends t
    ? t
    : extractMorphs<t, "in">

export type extractOut<t> = extractMorphs<t, "out"> extends t
    ? t
    : extractMorphs<t, "out">

type extractMorphs<t, io extends "in" | "out"> = t extends MorphAst<
    infer i,
    infer o
>
    ? io extends "in"
        ? i
        : o
    : t extends TerminallyInferredObjectKind | Primitive
    ? t
    : { [k in keyof t]: extractMorphs<t[k], io> }

/** Objects we don't want to expand during inference like Date or Promise */
type TerminallyInferredObjectKind = BuiltinObjects[Exclude<
    BuiltinObjectKind,
    "Object" | "Array"
>]
