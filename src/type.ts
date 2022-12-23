import type { TraversalNode, TypeSet } from "./nodes/node.ts"
import { compileNode } from "./nodes/node.ts"
import { resolveIfIdentifier } from "./nodes/utils.ts"
import type {
    inferDefinition,
    InferenceContext,
    validateDefinition
} from "./parse/definition.ts"
import { parseDefinition } from "./parse/definition.ts"
import type { DynamicScope, Scope } from "./scope.ts"
import { getRootScope } from "./scope.ts"
import { check } from "./traverse/check.ts"
import { Problems } from "./traverse/problems.ts"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.ts"
import type { Dict, equals, isTopType } from "./utils/generics.ts"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.ts"

const rawTypeFn: DynamicTypeFn = (
    definition,
    { scope = getRootScope(), ...config } = {}
) => {
    const node = resolveIfIdentifier(
        parseDefinition(definition, scope.$),
        scope.$
    )
    return new Type(node, compileNode(node, scope.$), config, scope as any)
}

export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

export type InferredTypeFn = <
    definition,
    scope extends Dict = {},
    c extends InferenceContext = { scope: scope }
>(
    definition: validateDefinition<definition, c>,
    options?: Config<scope>
) => isTopType<definition> extends true
    ? never
    : definition extends validateDefinition<definition, c>
    ? inferType<
          inferDefinition<
              definition,
              {
                  scope: scope
                  input: true
              }
          >,
          inferDefinition<definition, c>
      >
    : never

type DynamicTypeFn = (definition: unknown, options?: Config<Dict>) => Type

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export type inferType<input, output> = equals<input, output> extends true
    ? Type<output>
    : Type<(In: input) => output>

type In<T> = T extends (_: infer input) => unknown ? input : T

type Out<T> = T extends (_: any) => infer output ? output : T

export class Type<T = unknown> {
    constructor(
        public root: TypeSet,
        public flat: TraversalNode,
        public config: Config,
        public scope: DynamicScope
    ) {}

    get infer(): Out<T> {
        return chainableNoOpProxy
    }

    check(data: unknown) {
        return check(data, this.flat, this.scope.$)
            ? { data: data as Out<T> }
            : {
                  problems: new Problems({ path: "", reason: "invalid" })
              }
    }

    from(data: In<T>): Out<T> {
        return data as any
    }

    assert(data: unknown) {
        const result = this.check(data)
        if (result.problems) {
            throw new Error(`FAIL`)
        }
        // result.problems?.throw()
        return result.data as Out<T>
    }
}

export type Config<scope extends Dict = {}> = {
    scope?: Scope<scope>
}

// const t = type(["string", "=>", "number", (s) => s.length])

// const data = t.from("5")

// const oo = type("string|number")

// const zzt = type({ a: ["string", "=>", "number", (s) => s.length] })

// const ff = zzt.from({ a: "5" })

// const zzzt = type([["string", "=>", "number", (s) => s.length]])

// const fzf = zzzt.from()
