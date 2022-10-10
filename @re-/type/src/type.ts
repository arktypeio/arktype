import type { MutuallyExclusiveProps } from "@re-/tools"
import { Scope } from "./nodes/expression/infix/scope.js"
import type { inferAst } from "./nodes/traverse/ast/infer.js"
import type { validate } from "./nodes/traverse/ast/validate.js"
import type {
    Diagnostics,
    OptionsByDiagnostic
} from "./nodes/traverse/diagnostics.js"
import type { ParseError } from "./parser/common.js"
import { Root } from "./parser/root.js"
import type { ResolvedSpace } from "./space.js"

const emptyAliases = { aliases: {} }
const rawTypeFn: DynamicTypeFn = (def, ctx) => {
    const root = Root.parse(def, emptyAliases)
    if (ctx) {
        return new Scope.Node(root, ctx)
    }
    return root
}

const lazyTypeFn: DynamicTypeFn = (def, opts) => {
    let cache: any
    return new Proxy(
        {},
        {
            get: (_, k) => {
                if (!cache) {
                    cache = rawTypeFn(def, opts)
                }
                return cache[k]
            }
        }
    ) as any
}

export const type: TypeFn = rawTypeFn as any

// TODO: Abstract these variants as wrapper, reuse for space
type.dynamic = rawTypeFn
type.lazy = lazyTypeFn as any
type.lazyDynamic = lazyTypeFn

export type InferredTypeFn<Space extends ResolvedSpace> = <
    Definition,
    Ast = Root.parse<Definition, Space>,
    Inferred = inferAst<Ast, Space["resolutions"]>
>(
    definition: validate<Definition, Ast, Space["resolutions"]>,
    options?: ArktypeOptions
) => // TODO: Check objects?
Ast extends ParseError<string> ? never : Arktype<Inferred, Ast>

type DynamicTypeFn = (
    definition: unknown,
    options?: ArktypeOptions
) => DynamicArktype

export type TypeFn<Space extends ResolvedSpace = ResolvedSpace.Empty> =
    InferredTypeFn<Space> & {
        dynamic: DynamicTypeFn
        lazy: InferredTypeFn<Space>
        lazyDynamic: DynamicTypeFn
    }

export type Arktype<Inferred, Ast> = {
    infer: Inferred
    check: CheckFn<Inferred>
    assert: AssertFn<Inferred>
    toString(): string
    toAst(): Ast
    toDefinition(): unknown
}

export type DynamicArktype = Arktype<unknown, unknown>

export type ArktypeOptions = {
    errors?: OptionsByDiagnostic
}

export type CheckFn<Inferred> = (data: unknown) => CheckResult<Inferred>

export type CheckResult<Inferred> = MutuallyExclusiveProps<
    { data: Inferred },
    {
        errors: Diagnostics
    }
>

export type AssertFn<Inferred> = (value: unknown) => Inferred
