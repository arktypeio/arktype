import type { ArktypeConfig } from "./arktype.js"
import { Arktype } from "./arktype.js"
import type { inferAst } from "./ast/infer.js"
import type { validate } from "./ast/validate.js"
import type { dictionary } from "./internal.js"
import type { ParseError } from "./parser/common.js"
import { initializeParserContext } from "./parser/common.js"
import { Root } from "./parser/root.js"
import type { ArktypeSpace } from "./space.js"
import { space } from "./space.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const emptySpace: ArktypeSpace = space({})

const rawTypeFn: DynamicTypeFn = (
    definition,
    { space = emptySpace, ...config } = {}
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
