import type { MutuallyExclusiveProps } from "@re-/tools"
import { chainableNoOpProxy } from "@re-/tools"
import type { Base } from "../nodes/base.js"
import { Check } from "../nodes/traverse/check/check.js"
import type { Diagnostics } from "../nodes/traverse/check/diagnostics.js"
import type { ParseError } from "../parser/common.js"
import { initializeParserContext } from "../parser/common.js"
import { Root } from "../parser/root.js"
import type { InternalSpace, ResolvedSpace } from "./space.js"

const rawTypeFn: DynamicTypeFn = (def, opts) => {
    const ctx = initializeParserContext(opts)
    const root = Root.parse(def, ctx)
    return new InternalArktype(root, ctx)
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

export type InferredTypeFn<Space extends ResolvedSpace> = <
    Definition,
    ParseResult = Root.Parse<Definition, Space>,
    Inferred = Ast.Infer<ParseResult, Space["resolutions"]>
>(
    definition: Root.Validate<Definition, ParseResult>,
    options?: TypeOptions<Inferred>
) => ParseResult extends ParseError<string>
    ? never
    : Arktype<Inferred, ParseResult>

type DynamicTypeFn = (
    definition: unknown,
    options?: TypeOptions
) => DynamicArktype

export type TypeFn<Space extends ResolvedSpace = ResolvedSpace.Empty> =
    InferredTypeFn<Space> & {
        dynamic: DynamicTypeFn
        lazy: InferredTypeFn<Space>
        lazyDynamic: DynamicTypeFn
    }

export const type: TypeFn = rawTypeFn as any
// TODO: Abstract these variants as wrapper, reuse for space
type.dynamic = rawTypeFn
type.lazy = lazyTypeFn as any
type.lazyDynamic = lazyTypeFn

export type DynamicArktype = Arktype<unknown, unknown>

export type TypeOptions<Inferred = unknown> = Check.Options<Inferred>

export type InternalTypeOptions = TypeOptions<any> & {
    space?: InternalSpace
}

export type Arktype<Inferred, Ast> = {
    infer: Inferred
    check: CheckFn<Inferred>
    assert: AssertFn<Inferred>
    ast: Ast
}

export class ArktypeError extends Error {}

export class InternalArktype implements DynamicArktype {
    constructor(public root: Base.Node, public options: InternalTypeOptions) {}

    get infer() {
        return chainableNoOpProxy
    }

    get ast() {
        return this.root.toAst()
    }

    check(data: unknown) {
        const state = new Check.State(data, this.options)
        this.root.check(state)
        return state.errors.length
            ? {
                  errors: state.errors
              }
            : { data }
    }

    assert(data: unknown) {
        const validationResult = this.check(data)
        if (validationResult.errors) {
            throw new ArktypeError(validationResult.errors.summary)
        }
        return validationResult.data
    }
}

export type CheckFn<Inferred> = (data: unknown) => CheckResult<Inferred>

export type CheckResult<Inferred> = MutuallyExclusiveProps<
    { data: Inferred },
    {
        errors: Diagnostics.Diagnostics
    }
>

export type AssertFn<Inferred> = (value: unknown) => Inferred
