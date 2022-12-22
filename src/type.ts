import type { TraversalNode, TypeSet } from "./nodes/node.js"
import { compileNode } from "./nodes/node.js"
import { resolveIfIdentifier } from "./nodes/utils.js"
import type { inferDefinition, validateDefinition } from "./parse/definition.js"
import { parseDefinition } from "./parse/definition.js"
import type { DynamicScope, Scope } from "./scope.js"
import { getRootScope } from "./scope.js"
import { check } from "./traverse/check.js"
import { Problems } from "./traverse/problems.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import type { Dict, isTopType } from "./utils/generics.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const rawTypeFn: DynamicTypeFn = (
    definition,
    { scope = getRootScope(), ...config } = {}
) => {
    const node = resolveIfIdentifier(
        parseDefinition(definition, scope.$),
        scope.$
    )
    return new ArkType(node, compileNode(node, scope.$), config, scope as any)
}

export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

export type InferredTypeFn = <definition, scope extends Dict = {}>(
    definition: validateDefinition<definition, scope>,
    options?: Config<scope>
) => isTopType<definition> extends true
    ? never
    : definition extends validateDefinition<definition, scope>
    ? ArkType<inferDefinition<definition, scope, {}>>
    : never

type DynamicTypeFn = (definition: unknown, options?: Config<Dict>) => ArkType

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export type inferInput<t> = t extends (input: infer input) => unknown
    ? input
    : t extends object
    ? {
          [k in keyof t]: inferInput<t[k]>
      }
    : t

export type inferOutput<t> = t extends (input: any) => infer output
    ? output
    : t extends object
    ? {
          [k in keyof t]: inferOutput<t[k]>
      }
    : t

export class ArkType<t = unknown> {
    constructor(
        public root: TypeSet,
        public flat: TraversalNode,
        public config: Config,
        public scope: DynamicScope
    ) {}

    get infer(): inferOutput<t> {
        return chainableNoOpProxy
    }

    check(data: unknown) {
        return check(data, this.flat, this.scope.$)
            ? { data: data as inferOutput<t> }
            : {
                  problems: new Problems({ path: "", reason: "invalid" })
              }
    }

    from(data: inferInput<t>): inferOutput<t> {
        return data as any
    }

    assert(data: unknown) {
        const result = this.check(data)
        if (result.problems) {
            throw new Error(`FAIL`)
        }
        // result.problems?.throw()
        return result.data as inferOutput<t>
    }
}

export type Config<scope extends Dict = {}> = {
    scope?: Scope<scope>
}

// const t = type(["string", "=>", "number", (s) => s.length])

// const data = t.from("5")

// const zzt = type({ a: ["string", "=>", "number", (s) => s.length] })

// const ff = zzt.from({ a: "5" })

// const zzzt = type([["string", "=>", "number", (s) => s.length]])

// const fzf = zzzt.from()
