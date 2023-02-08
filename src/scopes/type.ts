import type { TraversalNode, TypeNode } from "../nodes/node"
import type {
    as,
    inferDefinition,
    validateDefinition
} from "../parse/definition"
import type { ParsedMorph } from "../parse/tuple/morph"
import type { Problems, ProblemsOptions } from "../traverse/problems"
import { TraversalState, traverse } from "../traverse/traverse"
import { chainableNoOpProxy } from "../utils/chainableNoOpProxy"
import type { defer, evaluateObject } from "../utils/generics"
import { hasKeys } from "../utils/generics"
import type { BuiltinClass } from "../utils/objectKinds"
import type { Scope } from "./scope"

export type TypeParser<$> = {
    <def>(def: validateDefinition<def, $>): parseType<def, $>

    <def>(def: validateDefinition<def, $>, opts: TypeOptions): parseType<def, $>
}

export type parseType<def, $> = def extends validateDefinition<def, $>
    ? Type<inferDefinition<def, $>>
    : never

type TypeRoot<t = unknown> = {
    [as]: t
    infer: asOut<t>
    node: TypeNode
    flat: TraversalNode
    meta: TypeMeta
}

export type TypeOptions = evaluateObject<
    {
        name?: string
    } & TypeConfig
>

export type TypeConfig = ProblemsOptions

type TypeMeta = {
    name: string
    id: QualifiedTypeName
    definition: unknown
    scope: Scope
    config: TypeConfig | undefined
    includesMorph: boolean
}

const compileTypeConfig = (
    opts: TypeOptions | undefined
): TypeConfig | undefined => {
    if (opts === undefined) {
        return
    }
    const { name, ...config } = opts
    if (hasKeys(config)) {
        return config
    }
}

export const initializeType = (
    definition: unknown,
    opts: TypeOptions | undefined,
    scope: Scope
) => {
    const name = opts?.name ?? "type"
    const config = compileTypeConfig(opts)
    const meta: TypeMeta = {
        name,
        id: `${scope.name}.${
            opts?.name ? name : `type${scope.createAnonymousTypeSuffix()}`
        }`,
        definition,
        scope,
        config,
        includesMorph: false
    }

    const root = {
        // temporarily initialize node/flat to aliases that will be included in
        // the final type in case of cyclic resolutions
        node: name,
        flat: [["alias", name]],
        meta,
        infer: chainableNoOpProxy
        // the "as" symbol from inferred is not used at runtime, so we check
        // that the rest of the type is correct then cast it
    } satisfies Omit<TypeRoot, typeof as> as TypeRoot

    // dynamically assign a name to the primary traversal function
    const namedTraverse: Checker<unknown> = {
        [name]: (data: unknown) => {
            const state = new TraversalState(type)
            const out = traverse(data, type.flat, state)
            return (
                state.problems.length
                    ? { data, problems: state.problems }
                    : { data, out }
            ) as CheckResult<unknown>
        }
    }[name]

    // we need to assign this to a variable before returning so we can reference
    // it in namedTraverse
    const type: Type = Object.assign(namedTraverse, root)
    return type
}

export const isType = (value: unknown): value is Type =>
    (value as Type)?.infer === chainableNoOpProxy

export type CheckResult<t> = ValidCheckResult<t> | InvalidCheckResult

type ValidCheckResult<t> = {
    data: asIn<t>
    out: asOut<t>
    problems?: never
}

type InvalidCheckResult = {
    data: unknown
    problems: Problems
    out?: never
}

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
    ? t extends Function | BuiltinClass
        ? t
        : { [k in keyof t]: asIo<t[k], io> }
    : t
