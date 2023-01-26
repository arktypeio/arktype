import type { TraversalNode, TypeResolution } from "./nodes/node.ts"
import type { inferDefinition, validateDefinition } from "./parse/definition.ts"
import { t } from "./parse/definition.ts"
import type { ParsedMorph } from "./parse/tuple/morph.ts"
import type { Scope } from "./scope.ts"
import type { ProblemsOptions } from "./traverse/check.ts"
import { traverse } from "./traverse/check.ts"
import type { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { defer, xor } from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

export const nodeToType = (
    node: TypeResolution,
    flat: TraversalNode,
    $: Scope,
    config: TypeOptions
) =>
    Object.assign(
        (data: unknown) => {
            return traverse(data, flat, $, config)
        },
        {
            [t]: chainableNoOpProxy,
            infer: chainableNoOpProxy,
            config,
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

export type Result<t> = xor<
    {
        data: asIn<t>
        out: asOut<t>
    },
    { problems: Problems }
>

export type Checker<t> = (data: unknown) => Result<t>

// TODO: add methods like .intersect, etc.
export type TypeRoot<t = unknown> = {
    [t]: t
    infer: asOut<t>
    node: TypeResolution
    flat: TraversalNode
}

export type Type<t = unknown> = defer<Checker<t> & TypeRoot<t>>

export type TypeOptions = {
    problems?: ProblemsOptions
}

export type asIn<t> = asIo<t, "in">

export type asOut<t> = asIo<t, "out">

type asIo<t, io extends "in" | "out"> = t extends ParsedMorph<infer i, infer o>
    ? io extends "in"
        ? i
        : o
    : t extends object
    ? t extends Function
        ? t
        : { [k in keyof t]: asIo<t[k], io> }
    : t
