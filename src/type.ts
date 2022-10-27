import type { inferAst } from "./ast/infer.js"
import type { validate } from "./ast/validate.js"
import type { AttributeNode } from "./attributes/attributes.js"
import type { dictionary } from "./internal.js"
import type { ParseError } from "./parser/common.js"
import { Root } from "./parser/root.js"
import type { ArktypeSpace } from "./space.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const rawTypeFn: DynamicTypeFn = (definition, { space, ...config } = {}) => {
    const root = Root.parse(definition, {
        aliases: space?.$.aliases ?? {}
    })
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
        public root: AttributeNode,
        public config: ArktypeConfig,
        public space: ArktypeSpace | undefined
    ) {
        // TODO: Integrate config
    }

    get infer(): Inferred {
        return chainableNoOpProxy
    }

    get ast(): Ast {
        return chainableNoOpProxy
    }

    check(data: unknown) {
        const state = {} as any
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
}

export type ArktypeConfig = dictionary
