import type { ArktypeConfig } from "./arktype.js"
import { Type } from "./arktype.js"
import type { parseError } from "./parse/errors.js"
import { parseRoot } from "./parse/parse.js"
import type { Scope } from "./scope.js"
import { scope } from "./scope.js"
import type { inferAst } from "./traverse/infer.js"
import type { validate } from "./traverse/validate.js"
import type { dictionary } from "./utils/dynamicTypes.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const rootScope: RootScope = scope({})

type RootScope = Scope<{}>

const rawTypeFn: DynamicTypeFn = (
    definition,
    { scope = rootScope, ...config } = {}
) => new Type(parseRoot(definition, scope as any), config, scope as any)

export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

export type InferredTypeFn = <
    definition,
    scope extends dictionary = {},
    ast = parseRoot<definition, scope>
>(
    definition: validate<definition, ast, scope>,
    options?: ArktypeConfig<scope>
) => ast extends parseError<string> ? never : Type<inferAst<ast, scope, {}>>

type DynamicTypeFn = (
    definition: unknown,
    options?: ArktypeConfig<dictionary>
) => Type

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>
