import type { Config } from "./arktype.js"
import { Type } from "./arktype.js"
import type { inferRoot } from "./ast/infer.js"
import type { validateRoot } from "./ast/validate.js"
import { parseRoot } from "./parse.js"
import { scope } from "./scope.js"
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

type DynamicTypeFn = (definition: unknown, options?: Config<dictionary>) => Type

export type TypeFn = LazyDynamicWrap<InferredTypeFn, DynamicTypeFn>
