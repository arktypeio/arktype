import type { Evaluate, MutuallyExclusiveProps } from "@re-/tools"
import { chainableNoOpProxy } from "@re-/tools"
import type { Base } from "./nodes/base.js"
import type { RootNode } from "./nodes/common.js"
import type { Diagnostics } from "./nodes/traverse/check/diagnostics.js"
import { ValidationError } from "./nodes/traverse/check/diagnostics.js"
import { CheckState } from "./nodes/traverse/check/exports.js"
import { Generate } from "./nodes/traverse/exports.js"
import type { Check, References } from "./nodes/traverse/exports.js"
import { initializeParserContext } from "./parser/common.js"
import { Root } from "./parser/root.js"
import type { ResolvedSpace, SpaceRoot } from "./space/root.js"

export const dynamic: DynamicTypeFn = (def, opts) => {
    const ctx = initializeParserContext(opts)
    const root = Root.parse(def, ctx)
    return new Type(def, root, ctx)
}

export const type: TypeFn = dynamic as any

export type DynamicTypeFn = (
    definition: unknown,
    options?: TypeOptions
) => DynamicTypeRoot

export type DynamicTypeRoot = TypeFrom<unknown, {}, unknown>

export type TypeOptions<Inferred = unknown> = {
    narrow?: Check.CustomConstraint<Inferred>
    errors?: Check.OptionsByDiagnostic
    generate?: Generate.GenerateOptions
}

export type InternalTypeOptions = TypeOptions<any> & {
    space?: SpaceRoot
}

export type TypeFn<Space extends ResolvedSpace = ResolvedSpace.Empty> = <
    Definition,
    Ast = Root.Parse<Definition, Space>
>(
    definition: Root.Validate<Definition, Ast>,
    options?: TypeOptions<RootNode.Infer<Ast, Space>>
) => ToType<Definition, Ast, Space["Resolutions"]>

export type ToType<Def, Ast, Resolutions> = TypeFrom<
    Def,
    Ast,
    RootNode.Infer<Ast, Resolutions>
>

export type TypeFrom<Def, Ast, Inferred> = Evaluate<{
    definition: Def
    infer: Inferred
    check: CheckFn<Inferred>
    assert: AssertFn<Inferred>
    default: Inferred
    ast: Ast
    generate: GenerateFn<Inferred>
    references: References.ReferencesFn<Ast>
}>

export class Type implements DynamicTypeRoot {
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
        return this.root.ast as any
    }

    check(data: unknown) {
        const state = new CheckState(data, this.options)
        this.root.check(state)
        return state.errors.length
            ? {
                  errors: state.errors
              }
            : { data: data }
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
