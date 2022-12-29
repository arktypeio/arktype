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
import type { aliasOf, RootScope, Scope } from "./scope.ts"
import { getRootScope } from "./scope.ts"
import { check } from "./traverse/check.ts"
import { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { defer, isTopType, nominal, xor } from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

export const rawTypeFn: DynamicTypeFn = (
    def,
    { scope = getRootScope(), ...config } = {}
) => {
    const node = resolveIfIdentifier(parseDefinition(def, scope), scope)
    return nodeToType(node, scope, config)
}

export const nodeToType = (root: TypeSet, scope: Scope, config: Morphs) => {
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
        sources extends Sources<inferRoot<def, scope>, scope>,
        targets extends Targets<inferRoot<def, scope>, scope>,
        scope extends Scope = RootScope
    >(
        def: validateRoot<def, scope>,
        opts: {
            scope?: scope
            from?: sources
            to?: targets
        }
    ): createType<
        def,
        scope,
        extractMorphs<inferRoot<def, scope>, scope, sources, targets>
    >
}

export type Sources<t, scope extends Scope> = {
    [name in Identifier<aliasOf<scope>>]?: InMorph<
        t,
        inferDefinition<name, scope>
    >
}

// TODO: possible to allow more args?
type InMorph<data, source> = (data: source) => data

type OutMorph<data, target> = (data: data) => target

export type Targets<data, scope extends Scope> = {
    [name in Identifier<aliasOf<scope>>]?: OutMorph<
        data,
        inferDefinition<name, scope>
    >
}

export type Morphs<data = unknown, scope extends Scope = Scope> = {
    from?: Sources<data, scope>
    to?: Targets<data, scope>
}

type createType<
    def,
    scope extends Scope,
    morphs extends Morphs<data, scope>,
    data = inferRoot<def, scope>
> = isTopType<def> extends true
    ? never
    : def extends validateDefinition<def, scope>
    ? morphs["from"] extends {}
        ? morphs["to"] extends {}
            ? Type<
                  (
                      from: keyof morphs["from"]
                  ) => (data: data) => to<keyof morphs["to"]>
              >
            : Type<(from: keyof morphs["from"]) => data>
        : morphs["to"] extends {}
        ? (data: data) => to<keyof morphs["to"]>
        : Type<data>
    : never

type extractMorphs<
    data,
    scope extends Scope,
    sources extends Sources<data, scope>,
    targets extends Targets<data, scope>
> = (Sources<data, scope> extends sources ? {} : { from: sources }) &
    (Targets<data, scope> extends targets ? {} : { to: targets })

type DynamicTypeOptions = { scope?: Scope } & Morphs

type DynamicTypeFn = (def: unknown, opts?: DynamicTypeOptions) => Type

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export type CheckResult<data> = xor<{ data: data }, { problems: Problems }>

export type Checker<data> = (data: unknown) => CheckResult<data>

export type TypeMetadata<data = unknown> = {
    infer: data
    root: TypeNode
    flat: TraversalNode
}

export type to<names> = defer<nominal<names, "to">>

export type Type<data = unknown> = defer<Checker<data> & TypeMetadata<data>>

type extractOutMorphs<scope extends Scope, outMorphs> = {
    [name in keyof outMorphs]: (
        target: name
    ) => CheckResult<inferDefinition<name, scope>>
}[keyof outMorphs]
