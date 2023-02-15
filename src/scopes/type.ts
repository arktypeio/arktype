import type { TraversalNode, TypeNode } from "../nodes/node.ts"
import type { ParsedMorph } from "../parse/ast/morph.ts"
import type {
    as,
    inferDefinition,
    validateDefinition
} from "../parse/definition.ts"
import type { ProblemOptions, Problems } from "../traverse/problems.ts"
import { TraversalState, traverse } from "../traverse/traverse.ts"
import { chainableNoOpProxy } from "../utils/chainableNoOpProxy.ts"
import type { defer, evaluate, xor } from "../utils/generics.ts"
import type { BuiltinClass } from "../utils/objectKinds.ts"
import type { Expressions } from "./expressions.ts"
import type { Scope } from "./scope.ts"

export type TypeParser<$> = {
    <def>(def: validateDefinition<def, $>): parseType<def, $>

    <def>(def: validateDefinition<def, $>, opts: TypeOptions): parseType<def, $>
} & TypeParserProps<$>

export type TypeParserProps<$> = {
    from: Expressions<$>["node"]
}

export type parseType<def, $> = [def] extends [validateDefinition<def, $>]
    ? Type<inferDefinition<def, $>>
    : never

type TypeRoot<t = unknown> = evaluate<{
    [as]: t
    infer: asOut<t>
    node: TypeNode
    flat: TraversalNode
    qualifiedName: QualifiedTypeName
    definition: unknown
    scope: Scope
    includesMorph: boolean
    config: TypeConfig | undefined
}>

export type KeyCheckKind = "loose" | "strict" | "distilled"

export type TypeOptions = evaluate<
    {
        keys?: KeyCheckKind
        name?: string
    } & ProblemOptions
>

export type TypeConfig = Omit<TypeOptions, "name">

export const initializeType = (
    name: string,
    definition: unknown,
    config: TypeConfig | undefined,
    scope: Scope
) => {
    const root = {
        // temporarily initialize node/flat to aliases that will be included in
        // the final type in case of cyclic resolutions
        node: name,
        flat: [["alias", name]],
        infer: chainableNoOpProxy,
        qualifiedName: `${scope.name}.${name}`,
        definition,
        scope,
        includesMorph: false,
        config
        // the "as" symbol from inferred is not used at runtime, so we check
        // that the rest of the type is correct then cast it
    } satisfies Omit<TypeRoot, typeof as> as TypeRoot

    // dynamically assign a name to the primary traversal function
    const namedTraverse = {
        [name]: (data: unknown) => {
            const state = new TraversalState(data, namedTraverse)
            return (
                traverse(namedTraverse.flat, state)
                    ? { data: state.data }
                    : { problems: state.problems }
            ) as CheckResult<unknown>
        }
    }[name] as Type
    return Object.assign(namedTraverse, root)
}

export const isType = (value: unknown): value is Type =>
    (value as Type)?.infer === chainableNoOpProxy

export type CheckResult<t> = xor<{ data: asOut<t> }, { problems: Problems }>

type Checker<t> = (data: unknown) => CheckResult<t>

export type Type<t = unknown> = defer<Checker<t> & TypeRoot<t>>

export type QualifiedTypeName = `${string}.${string}`

export type asIn<t> = asIo<t, "in">

export type asOut<t> = asIo<t, "out">

type asIo<t, io extends "in" | "out"> = t extends ParsedMorph<infer i, infer o>
    ? io extends "in"
        ? i
        : o
    : t extends object
    ? t extends BuiltinClass | ((...args: any[]) => any)
        ? t
        : { [k in keyof t]: asIo<t[k], io> }
    : t
