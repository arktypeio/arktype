import type { Evaluate, MutuallyExclusiveProps } from "@re-/tools"
import { chainableNoOpProxy } from "@re-/tools"
import type { Base } from "./nodes/base.js"
import type { RootNode } from "./nodes/common.js"
import type { Diagnostics } from "./nodes/traverse/check/diagnostics.js"
import { ValidationError } from "./nodes/traverse/check/diagnostics.js"
import { CheckState } from "./nodes/traverse/check/exports.js"
import { Generate } from "./nodes/traverse/exports.js"
import type { Check, References } from "./nodes/traverse/exports.js"
import type { ParserContext } from "./parser/common.js"
import { initializeParseContext } from "./parser/common.js"
import { Root } from "./parser/root.js"
import type { SpaceRoot } from "./space/root.js"

export const type: TypeFn = (definition, options = {}, space?: SpaceRoot) => {
    const root = Root.parse(
        definition,
        initializeParseContext(options as any, space)
    )
    return new Type(definition, root, options as any) as any
}

export const dynamic = type as any as DynamicTypeFn

export type DynamicTypeFn = (
    definition: unknown,
    options?: TypeOptions
) => DynamicType

export type DynamicType = TypeFrom<unknown, {}, unknown>

export type TypeOptions<Inferred = unknown> = {
    narrow?: Check.CustomConstraint<Inferred>
    errors?: Check.OptionsByDiagnostic
    generate?: Generate.GenerateOptions
}

// TODO: Can ParserContext just have names?
export type TypeFn<
    Ctx extends ParserContext = { Space: {} },
    Resolutions = {}
> = <D>(
    definition: Root.Validate<D, Ctx>,
    // TODO: Better to have this in generics?
    options?: TypeOptions<RootNode.Infer<Root.Parse<D, Ctx>, Ctx>>
) => ToType<D, Root.Parse<D, Ctx>, Resolutions>

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
    //references: (...args: any[]) => string[] //References.ReferencesFn<Def, Dict>
}>

export class Type implements DynamicType {
    constructor(
        public definition: unknown,
        public root: Base.node,
        public options: TypeOptions
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
