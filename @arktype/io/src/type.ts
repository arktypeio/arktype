import type { Dictionary } from "@arktype/tools"
import { chainableNoOpProxy } from "@arktype/tools"
import type { LazyDynamicWrap } from "./internal.js"
import { lazyDynamicWrap } from "./internal.js"
import type { inferAst } from "./nodes/ast/infer.js"
import type { validate } from "./nodes/ast/validate.js"
import type { Base } from "./nodes/base/base.js"
import { Traversal } from "./nodes/base/traversal.js"
import { Scope } from "./nodes/expression/infix/scope.js"
import type { ParseError } from "./parser/common.js"
import { Root } from "./parser/root.js"
import type { ArktypeSpace } from "./space.js"

const emptyAliases = { aliases: {} }
const rawTypeFn: DynamicTypeFn = (definition, { space, ...config } = {}) => {
    const root = Root.parse(definition, space?.$ ?? emptyAliases)
    return new Arktype(root, config, space as any)
}

export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

export type TypeFnOptions<resolutions = {}> = ArktypeConfig & {
    space?: ArktypeSpace<resolutions>
}

export type InferredTypeFn = <
    definition,
    resolutions = {},
    ast = Root.parse<definition, { aliases: resolutions }>,
    inferred = inferAst<ast, resolutions>
>(
    definition: validate<definition, ast, resolutions>,
    options?: TypeFnOptions<resolutions>
) => ast extends ParseError<string> ? never : Arktype<inferred, ast>

type DynamicTypeFn = <resolutions = {}>(
    definition: unknown,
    options?: TypeFnOptions<resolutions>
) => Arktype

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export class Arktype<Inferred = unknown, Ast = unknown> {
    constructor(
        public root: Base.Node,
        public config: ArktypeConfig,
        public space: ArktypeSpace | undefined
    ) {
        if (Object.keys(config).length) {
            this.root = new Scope.Node(root, config)
        }
    }

    get infer(): Inferred {
        return chainableNoOpProxy
    }

    check(data: unknown) {
        const state = new Traversal(data, this.space)
        this.root.traverse(state)
        return state.problems.length
            ? {
                  problems: state.problems
              }
            : { data: data as Inferred }
    }

    assert(data: unknown) {
        const result = this.check(data)
        result.problems?.throw()
        return result.data as Inferred
    }

    toString() {
        return this.root.toString()
    }

    get ast() {
        return this.root.ast as Ast
    }

    get definition() {
        return this.root.definition
    }
}

export type ArktypeConfig = {
    errors?: Dictionary
}
