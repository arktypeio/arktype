import type {
    Identifier,
    TraversalNode,
    TypeNode,
    TypeSet
} from "./nodes/node.ts"
import { compileNode } from "./nodes/node.ts"
import { resolveIfIdentifier } from "./nodes/utils.ts"
import type {
    inferDefinition,
    inferRoot,
    validateDefinition,
    validateRoot
} from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import type { UnaryFunction } from "./parse/tuple/utils.ts"
import type { aliasOf, RootScope, Scope } from "./scope.ts"
import { getRootScope, scope } from "./scope.ts"
import { check } from "./traverse/check.ts"
import { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type {
    autocomplete,
    defer,
    isTopType,
    nominal,
    xor
} from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

export const rawTypeFn: DynamicTypeFn = (
    def,
    { scope = getRootScope(), ...config } = {}
) => {
    const node = resolveIfIdentifier(parseDefinition(def, scope), scope)
    return nodeToType(node, scope, config)
}

export const nodeToType = (
    root: TypeSet,
    scope: Scope,
    config: Morphs<unknown, Scope>
) => {
    const traversal = compileNode(root, scope)
    return Object.assign(
        (data: unknown) => {
            const result = check(data, traversal, scope)
            return result
                ? { data }
                : { problems: new Problems({ path: "", reason: "invalid" }) }
        },
        {
            config,
            infer: chainableNoOpProxy,
            root,
            flat: traversal
        }
    ) as any
}

export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

export type InferredTypeFn = {
    <def>(def: validateRoot<def, RootScope>): createType<def, RootScope, {}>

    <
        def,
        sources extends Sources<inferRoot<def, s>, s>,
        targets extends Targets<inferRoot<def, s>, s>,
        s extends Scope = RootScope
    >(
        def: validateRoot<def, s>,
        opts: {
            scope?: s
            in?: sources
            out?: targets
        }
    ): createType<def, s, extractMorphs<inferRoot<def, s>, s, sources, targets>>
}

export type Sources<t, s extends Scope> = {
    [name in Identifier<aliasOf<s>>]?: InMorph<t, inferDefinition<name, s>>
}

// TODO: possible to allow more args?
type InMorph<t, source> = (data: source) => t

type OutMorph<t, target> = (data: t) => target

export type Targets<t, s extends Scope> = {
    [name in Identifier<aliasOf<s>>]?: OutMorph<t, inferDefinition<name, s>>
}

export type Morphs<t = unknown, s extends Scope = Scope> = {
    in?: Sources<t, s>
    out?: Targets<t, s>
}

type createType<
    def,
    s extends Scope,
    morphs extends Morphs<data, s>,
    data = inferRoot<def, s>
> = isTopType<def> extends true
    ? never
    : def extends validateDefinition<def, s>
    ? {} extends morphs
        ? Type<data>
        : Type<(In: keyof morphs["in"]) => (data: data) => keyof morphs["out"]>
    : never

type extractMorphs<
    t,
    s extends Scope,
    sources extends Sources<t, s>,
    targets extends Targets<t, s>
> = (Sources<t, s> extends sources ? {} : { in: sources }) &
    (Targets<t, s> extends targets ? {} : { out: targets })

type DynamicTypeOptions = { scope?: Scope } & Morphs<unknown, Scope>

type DynamicTypeFn = (def: unknown, opts?: DynamicTypeOptions) => Type

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export type CheckResult<data> = xor<{ data: data }, { problems: Problems }>

export type Checker<data> = (data: unknown) => CheckResult<data>

export type TypeMetadata<t = unknown> = {
    infer: t
    root: TypeNode
    flat: TraversalNode
}

export type Type<t = unknown> = defer<
    t extends (data: infer data) => infer morphs
        ? Checker<data> & TypeMetadata<data>
        : Checker<t> & TypeMetadata<t>
>

type extractOutMorphs<s extends Scope, outMorphs> = {
    [name in keyof outMorphs]: (
        target: name
    ) => CheckResult<inferDefinition<name, s>>
}[keyof outMorphs]
