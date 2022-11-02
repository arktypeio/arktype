import type { ArktypeConfig } from "./arktype.js"
import { Arktype } from "./arktype.js"
import type { inferAst } from "./ast/infer.js"
import type { validate } from "./ast/validate.js"
import type { ParseError } from "./parser/common.js"
import { parseRoot } from "./parser/parse.js"
import type { ArktypeSpace } from "./space.js"
import { space } from "./space.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const emptySpace: EmptySpace = space({})

type EmptySpace = ArktypeSpace<{}>

const rawTypeFn: DynamicTypeFn = (
    definition,
    { space = emptySpace, ...config } = {}
) => new Arktype(parseRoot(definition, space.$), config, space as ArktypeSpace)

export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

export type TypeFnOptions<space> = ArktypeConfig & {
    space?: space
}

export type InferredTypeFn = <
    definition,
    space = EmptySpace,
    ast = parseRoot<definition, { aliases: space }>
>(
    definition: validate<definition, ast, space>,
    options?: TypeFnOptions<space>
) => ast extends ParseError<string> ? never : Arktype<inferAst<ast, space>>

type DynamicTypeFn = (
    definition: unknown,
    options?: TypeFnOptions<ArktypeSpace>
) => Arktype

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>
