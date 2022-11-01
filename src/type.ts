import type { inferAst } from "./ast/infer.js"
import type { validate } from "./ast/validate.js"
import type { Attributes } from "./attributes/shared.js"
import type { dictionary } from "./internal.js"
import type { ParseError } from "./parser/common.js"
import { initializeParserContext } from "./parser/common.js"
import { Root } from "./parser/root.js"
import type { ArktypeSpace } from "./space.js"
import { defaultSpace } from "./space.js"
import { chainableNoOpProxy } from "./utils/chainableNoOpProxy.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const rawTypeFn: DynamicTypeFn = (
    definition,
    { space = defaultSpace, ...config } = {}
) =>
    new Arktype(
        Root.parse(definition, initializeParserContext(space.$)),
        config,
        space
    )

export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

export type TypeFnOptions<resolutions extends dictionary = {}> =
    ArktypeConfig & {
        space?: ArktypeSpace<resolutions>
    }

export type InferredTypeFn = <
    definition,
    spaceAst extends dictionary = {},
    ast = Root.parse<definition, { aliases: spaceAst }>
>(
    definition: validate<definition, ast, spaceAst>,
    options?: TypeFnOptions<spaceAst>
) => ast extends ParseError<string> ? never : Arktype<inferAst<ast, spaceAst>>

type DynamicTypeFn = (
    definition: unknown,
    options?: TypeFnOptions<dictionary<unknown>>
) => Arktype

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>

export class Arktype<Inferred = unknown> {
    constructor(
        public attributes: Attributes,
        public config: ArktypeConfig,
        public space: ArktypeSpace
    ) {
        // TODO: Integrate config
    }

    get infer(): Inferred {
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
