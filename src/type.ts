import type { TraversalNode, TypeResolution } from "./nodes/node.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import type { Morph, out } from "./parse/tuple/morph.ts"
import type { ScopeRoot } from "./scope.ts"
import { type } from "./scope.ts"
import type { CheckConfig } from "./traverse/check.ts"
import { rootCheck } from "./traverse/check.ts"
import type { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { defer, xor } from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

export const nodeToType = (
    root: TypeResolution,
    flat: TraversalNode,
    $: ScopeRoot,
    config: TypeOptions
): Type => {
    return Object.assign(
        (data: unknown) => {
            return rootCheck(data, flat, $, config)
        },
        {
            config,
            infer: chainableNoOpProxy,
            root,
            flat
        }
    ) as any
}

export const isType = (value: unknown): value is Type =>
    (value as Type)?.infer === chainableNoOpProxy

export type InferredTypeParser<$> = {
    <def>(def: validateDefinition<def, $>): parseType<def, $>

    <def>(def: validateDefinition<def, $>, opts: TypeOptions): parseType<def, $>
}

export type parseType<def, $> = def extends validateDefinition<def, $>
    ? containsMorphDefinition<def> extends true
        ? Type<(In: inferDefinition<def, $>) => inferDefinition<def, out<$>>>
        : Type<inferDefinition<def, $>>
    : never

type containsMorphDefinition<def> = def extends Morph
    ? true
    : def extends object
    ? bubbleUpResult<{ [k in keyof def]: containsMorphDefinition<def[k]> }>
    : false

type bubbleUpResult<result> = result[keyof result] extends false ? false : true

type DynamicTypeParser = (def: unknown, opts?: TypeOptions) => Type

export type TypeParser<$> = LazyDynamicWrap<
    InferredTypeParser<$>,
    DynamicTypeParser
>

export type Result<output> = xor<output, { problems: Problems }>

export type Checker<output> = (data: unknown) => Result<output>

export type TypeRoot<t = unknown> = {
    infer: In<t>
    node: TypeResolution
    flat: TraversalNode
} & (t extends Morph ? { inferOut: Out<t> } : {})

export type Type<data = unknown> = defer<
    Checker<{ data: data }> & TypeRoot<data>
>

export type TypeOptions = CheckConfig

type In<t> = t extends (_: infer input) => unknown ? input : t

type Out<t> = t extends (_: any) => infer output ? output : t
