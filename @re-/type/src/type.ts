import type { Evaluate, MutuallyExclusiveProps } from "@re-/tools"
import { chainableNoOpProxy } from "@re-/tools"
import type { Base } from "./nodes/base.js"
import type { RootNode } from "./nodes/common.js"
import { checkCustomValidator } from "./nodes/traverse/check/customValidator.js"
import {
    Diagnostics,
    ValidationError
} from "./nodes/traverse/check/diagnostics.js"
import { Check, Generate } from "./nodes/traverse/exports.js"
import type { References } from "./nodes/traverse/exports.js"
import type { ParseOptions } from "./parser/common.js"
import { initializeParseContext } from "./parser/common.js"
import { Root } from "./parser/root.js"
import type { Space, SpaceMeta } from "./space.js"

export const type: TypeFn = (definition, options = {}, space?: SpaceMeta) => {
    const root = Root.parse(definition, initializeParseContext(options, space))
    return new Type(definition, root, options) as any
}

export const dynamic = type as DynamicTypeFn

export type DynamicTypeFn = (
    definition: unknown,
    options?: TypeOptions
) => DynamicType

export type DynamicType = TypeFrom<unknown, {}, unknown>

export type TypeOptions = {
    parse?: ParseOptions
    validate?: Check.CheckOptions
    generate?: Generate.GenerateOptions
}

export type TypeFn<S extends Space = { Dict: {}; Meta: {} }> = <Def>(
    definition: Root.Validate<Def, S["Dict"]>,
    options?: TypeOptions
) => TypeFrom<Def, S["Dict"], Infer<Def, Base.InferenceContext.FromSpace<S>>>

export type TypeFrom<Def, Dict, Inferred> = Evaluate<{
    definition: Def
    infer: Inferred
    check: CheckFn<Inferred>
    assert: AssertFn<Inferred>
    default: Inferred
    ast: Root.Parse<Def, Dict>
    create: GenerateFn<Inferred>
    references: References.ReferencesFn<Def, Dict>
}>

export class Type implements DynamicType {
    constructor(
        public definition: unknown,
        public root: Base.node,
        public config: TypeOptions = {}
    ) {}

    get infer() {
        return chainableNoOpProxy
    }

    get default() {
        return this.create()
    }

    get ast() {
        return this.root.ast as any
    }

    check(value: unknown, options?: Check.CheckOptions) {
        const args = Check.createCheckArgs(value, options, this.config.validate)
        const customValidator =
            args.cfg.validator ?? args.context.modelCfg.validator ?? "default"
        if (customValidator !== "default") {
            checkCustomValidator(customValidator, this.root, args)
        } else {
            this.root.check(args)
        }
        return args.diagnostics.length
            ? {
                  errors: new Diagnostics(...args.diagnostics)
              }
            : { data: value }
    }

    assert(value: unknown, options?: Check.CheckOptions) {
        const validationResult = this.check(value, options)
        if (validationResult.errors) {
            throw new ValidationError(validationResult.errors.summary)
        }
        return validationResult.data
    }

    create(options?: Generate.GenerateOptions) {
        return this.root.generate(
            Generate.createGenerateArgs(options, this.config.generate)
        )
    }

    references(options: References.ReferencesOptions = {}) {
        return this.root.references(options) as any
    }
}

export type CheckFn<Inferred> = (
    data: unknown,
    options?: Check.CheckOptions
) => CheckResult<Inferred>

export type CheckResult<Inferred> = MutuallyExclusiveProps<
    { data: Inferred },
    {
        errors: Diagnostics
    }
>

export type AssertFn<Inferred> = (
    value: unknown,
    options?: Check.CheckOptions
) => Inferred

export type GenerateFn<Inferred> = (
    options?: Generate.GenerateOptions
) => Inferred

export type Infer<Def, S extends Space> = RootNode.Infer<
    Def,
    Base.InferenceContext.From<{
        Dict: S["Dict"]
        Meta: S["Meta"]
        Seen: {}
    }>
>

export type Validate<Def, Dict = {}> = Root.Validate<Def, Dict>
