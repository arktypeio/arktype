import type { TraversalNode, TypeResolution } from "./nodes/node.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import type { ParsedMorph } from "./parse/tuple/morph.ts"
import type { ScopeRoot } from "./scope.ts"
import type { CheckConfig } from "./traverse/check.ts"
import { rootCheck } from "./traverse/check.ts"
import type { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { defer, xor } from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

export const nodeToType = (
    node: TypeResolution,
    flat: TraversalNode,
    $: ScopeRoot,
    config: TypeOptions
) =>
    Object.assign(
        (data: unknown) => {
            return rootCheck(data, flat, $, config)
        },
        {
            t: chainableNoOpProxy,
            config,
            infer: chainableNoOpProxy,
            node,
            flat
        }
    ) as Type

export const isType = (value: unknown): value is Type =>
    (value as Type)?.infer === chainableNoOpProxy

export type InferredTypeParser<$> = {
    <def>(def: validateDefinition<def, $>): parseType<def, $>

    <def>(def: validateDefinition<def, $>, opts: TypeOptions): parseType<def, $>
}

export type parseType<def, $> = def extends validateDefinition<def, $>
    ? Type<inferDefinition<def, $>>
    : never

type DynamicTypeParser = (def: unknown, opts?: TypeOptions) => Type

export type TypeParser<$> = LazyDynamicWrap<
    InferredTypeParser<$>,
    DynamicTypeParser
>

export type Result<output> = xor<output, { problems: Problems }>

export type Checker<output> = (data: unknown) => Result<output>

export type TypeRoot<t = unknown> = {
    t: t
    infer: inferIo<t, "out">
    node: TypeResolution
    flat: TraversalNode
}

export type Type<t = unknown> = defer<
    Checker<{ data: inferIo<t, "in"> }> & TypeRoot<t>
>

export type TypeOptions = CheckConfig

type inferIo<t, io extends "in" | "out"> = t extends ParsedMorph<
    infer i,
    infer o
>
    ? io extends "in"
        ? i
        : o
    : t extends object
    ? { [k in keyof t]: inferIo<t[k], io> }
    : t
