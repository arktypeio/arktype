import type { Config } from "./arktype.js"
import { Type } from "./arktype.js"
import { parseRoot } from "./parse/parse.js"
import { scope } from "./scope.js"
import type { inferRoot } from "./traverse/infer.js"
import type { validateRoot } from "./traverse/validate.js"
import type { dictionary } from "./utils/dynamicTypes.js"
import type { LazyDynamicWrap } from "./utils/lazyDynamicWrap.js"
import { lazyDynamicWrap } from "./utils/lazyDynamicWrap.js"

const rootScope = scope({})

const rawTypeFn: DynamicTypeFn = (
    definition,
    { scope = rootScope, ...config } = {}
) => new Type(parseRoot(definition, scope as any), config, scope as any)

export const type: TypeFn = lazyDynamicWrap<InferredTypeFn, DynamicTypeFn>(
    rawTypeFn
)

export type InferredTypeFn = <definition, scope extends dictionary = {}>(
    definition: validateRoot<definition, scope>,
    options?: Config<scope>
) => Type<inferRoot<definition, scope, {}>>

//ast extends error<string> ? never : Type<inferAst<ast, scope, {}>>

type DynamicTypeFn = (definition: unknown, options?: Config<dictionary>) => Type

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>
