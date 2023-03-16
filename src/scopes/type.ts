import { createTraverse } from "../nodes/compile.ts"
import type { Node } from "../nodes/node.ts"
import type { CheckResult, TraversalState } from "../nodes/traverse.ts"
import type { ParsedMorph } from "../parse/ast/morph.ts"
import type {
    as,
    inferDefinition,
    validateDefinition
} from "../parse/definition.ts"
import { chainableNoOpProxy } from "../utils/chainableNoOpProxy.ts"
import type { defer, evaluate } from "../utils/generics.ts"
import type { BuiltinClass } from "../utils/objectKinds.ts"
import type { Expressions } from "./expressions.ts"
import type { Scope } from "./scope.ts"

export type TypeParser<$> = {
    // Parse and check the definition, returning either the original input for a
    // valid definition or a string representing an error message.
    <def>(def: validateDefinition<def, $>): parseType<def, $>

    <def>(def: validateDefinition<def, $>, opts: TypeOptions): parseType<def, $>
} & TypeParserProps<$>

export type TypeParserProps<$> = {
    from: Expressions<$>["node"]
}

// Reuse the validation result to determine if the type will be successfully created.
// If it will, infer it and create a validator. Otherwise, return never.
export type parseType<def, $> = [def] extends [validateDefinition<def, $>]
    ? Type<inferDefinition<def, $>>
    : never

type TypeRoot<t = unknown> = evaluate<{
    [as]: t
    infer: asOut<t>
    js: string
    allows: (data: unknown) => data is t
    assert: (data: unknown) => t
    traverse: CompiledTraversal
    check: Checker<t>
    node: Node
    qualifiedName: QualifiedTypeName
    definition: unknown
    scope: Scope
    includesMorph: boolean
    config: TypeConfig
}>

export type KeyCheckKind = "loose" | "strict" | "distilled"

export type TypeOptions = evaluate<{
    keys?: KeyCheckKind
    mustBe?: string
}>

export type TypeConfig = TypeOptions

export type CompiledTraversal = (
    data: unknown,
    state: TraversalState
) => TraversalState

export const initializeType = (
    name: string,
    definition: unknown,
    config: TypeConfig,
    scope: Scope
) => {
    const root = {
        // temporarily initialize node/flat to aliases that will be included in
        // the final type in case of cyclic resolutions
        node: name,
        js: uninitializedJs,
        check: uninitializedTraversal,
        traverse: uninitializedTraversal,
        allows: (data): data is any => !namedTraverse(data).problems,
        assert: (data) => {
            const result = namedTraverse(data)
            return result.problems ? result.problems.throw() : result.data
        },
        infer: chainableNoOpProxy,
        qualifiedName: isAnonymousName(name)
            ? scope.getAnonymousQualifiedName(name)
            : `${scope.name}.${name}`,
        definition,
        scope,
        includesMorph: false,
        config
        // the "as" symbol from inferred is not used at runtime, so we check
        // that the rest of the type is correct then cast it
    } satisfies Omit<TypeRoot, typeof as> as TypeRoot

    // define within a key to dynamically assign a name to the function
    const namedTraverse = {
        [name]: (data: unknown) => (namedTraverse as Type).check(data)
    }[name]

    const t = Object.assign(namedTraverse, root)
    return t
}

const uninitializedJs = createTraverse(
    "uninitialized",
    `throw new Error("Unexpected attempt to check uncompiled type.")`
)

const uninitializedTraversal = Function(uninitializedJs)()

export const isType = (value: unknown): value is Type =>
    (value as Type)?.infer === chainableNoOpProxy

export type Type<t = unknown> = defer<Checker<t> & TypeRoot<t>>

export type Checker<t> = (data: unknown) => CheckResult<asOut<t>>

export type QualifiedTypeName = `${string}.${string}`

export type AnonymousTypeName = `λ${string}`

export const isAnonymousName = (name: string): name is AnonymousTypeName =>
    name[0] === "λ"

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
