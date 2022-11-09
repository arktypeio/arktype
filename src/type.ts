import type { ArktypeConfig } from "./arktype.js"
import { Arktype } from "./arktype.js"
import type { ParseError } from "./parse/common.js"
import { parseRoot } from "./parse/parse.js"
import type { ArktypeScope } from "./scope.js"
import { scope } from "./scope.js"
import type { inferAst } from "./traverse/infer.js"
import type { validate } from "./traverse/validate.js"
import type { dictionary } from "./utils/dynamicTypes.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const rootScope: EmptyScope = scope({})

type EmptyScope = ArktypeScope<{}>

const rawTypeFn: DynamicTypeFn = (
    definition,
    { scope = rootScope, ...config } = {}
) => new Arktype(parseRoot(definition, scope.$), config, scope as any)

export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

export type InferredTypeFn = <
    definition,
    scope extends dictionary = {},
    ast = parseRoot<definition, { aliases: scope }>
>(
    definition: validate<definition, ast, scope>,
    options?: ArktypeConfig<scope>
) => ast extends ParseError<string> ? never : Arktype<inferAst<ast, scope, {}>>

type DynamicTypeFn = (
    definition: unknown,
    options?: ArktypeConfig<dictionary>
) => Arktype

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>
