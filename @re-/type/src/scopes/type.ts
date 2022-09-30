import type { Evaluate, MutuallyExclusiveProps } from "@re-/tools"
import { chainableNoOpProxy } from "@re-/tools"
import type { Base } from "../nodes/base.js"
import type { Infer } from "../nodes/traverse/ast/infer.js"
import type { Diagnostics } from "../nodes/traverse/check/diagnostics.js"
import { ValidationError } from "../nodes/traverse/check/diagnostics.js"
import { CheckState } from "../nodes/traverse/check/exports.js"
import { Generate } from "../nodes/traverse/exports.js"
import type { Check, References } from "../nodes/traverse/exports.js"
import { initializeParserContext } from "../parser/common.js"
import { Root } from "../parser/root.js"
import type { ResolvedSpace, SpaceRoot } from "./space.js"

const rawTypeFn: DynamicTypeFn = (def, opts) => {
    const ctx = initializeParserContext(opts)
    const root = Root.parse(def, ctx)
    return new TypeRoot(def, root, ctx)
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
    Ast = Root.Parse<Definition, Space>,
    Inferred = Infer<Ast, Space["resolutions"]>
>(
    definition: Root.Validate<Definition, Ast>,
    options?: TypeOptions<Inferred>
) => TypeRoot.New<Definition, Ast, Inferred>

type DynamicTypeFn = (
    definition: unknown,
    options?: TypeOptions
) => DynamicTypeRoot

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

export type DynamicTypeRoot = TypeRoot.New<unknown, unknown, unknown>

export type TypeOptions<Inferred = unknown> = {
    narrow?: Check.NarrowFn<Inferred>
    errors?: Check.OptionsByDiagnostic
    generate?: Generate.GenerateOptions
}

export type InternalTypeOptions = TypeOptions<any> & {
    space?: SpaceRoot
}

export namespace TypeRoot {
    export type New<Def, Ast, Inferred> = Evaluate<{
        definition: Def
        infer: Inferred
        check: CheckFn<Inferred>
        assert: AssertFn<Inferred>
        default: Inferred
        ast: Ast
        generate: GenerateFn<Inferred>
        references: References.ReferencesFn<Ast>
    }>
}

export class TypeRoot implements DynamicTypeRoot {
    constructor(
        public definition: unknown,
        public root: Base.node,
        public options: InternalTypeOptions
    ) {}

    get infer() {
        return chainableNoOpProxy
    }

    get default() {
        return this.generate()
    }

    get ast() {
        return this.root.toAst()
    }

    check(data: unknown) {
        const state = new CheckState(data, this.options)
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
            throw new ValidationError(validationResult.errors.summary)
        }
        return validationResult.data
    }

    generate() {
        const state = new Generate.GenerateState(this.options)
        return this.root.generate(state)
    }

    references(options: References.ReferencesOptions = {}) {
        return this.root.references(options) as any
    }
}

export type CheckFn<Inferred> = (data: unknown) => CheckResult<Inferred>

export type CheckResult<Inferred> = MutuallyExclusiveProps<
    { data: Inferred },
    {
        errors: Diagnostics
    }
>

export type AssertFn<Inferred> = (value: unknown) => Inferred

export type GenerateFn<Inferred> = (
    options?: Generate.GenerateOptions
) => Inferred
