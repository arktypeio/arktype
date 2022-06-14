import { deepMerge, EntriesOf, Evaluate, Merge } from "@re-/tools"
import { Model, ModelFrom, ModelFunction } from "./model.js"
import { Root } from "./nodes/index.js"
import { Branch, Common } from "#common"

export const compile: CompileFunction = (dictionary, options) =>
    new Space(dictionary, options) as any

export class Space implements SpaceFrom<any> {
    inputs: SpaceFrom<any>["inputs"]
    models: Record<string, Model>
    modelDefinitionEntries: EntriesOf<SpaceDictionary>
    config: SpaceConfig
    modelConfigs: Record<string, Common.BaseOptions>
    resolutions: Common.ResolutionMap

    constructor(dictionary: SpaceDictionary, options?: SpaceOptions<string>) {
        this.inputs = { dictionary, options }
        const normalized = normalizeSpaceInputs(dictionary, options)
        this.config = normalized.config
        this.modelConfigs = normalized.modelConfigs
        this.modelDefinitionEntries = normalized.modelDefinitionEntries
        this.resolutions = {}
        this.models = {}
        for (const [typeName, definition] of this.modelDefinitionEntries) {
            const modelConfig = deepMerge(
                this.config,
                this.modelConfigs[typeName]
            )
            this.resolutions[typeName] = new Resolution(
                typeName,
                definition,
                Common.createRootParseContext(modelConfig, this.resolutions)
            )
            this.models[typeName] = new Model(
                this.resolutions[typeName],
                modelConfig
            )
        }
    }

    create(def: any, options?: Common.BaseOptions) {
        const root = Root.parse(
            def,
            Common.createRootParseContext(options, this.resolutions)
        )
        return new Model(root, deepMerge(this.config, options)) as any
    }

    extend(extensions: SpaceDictionary, overrides?: SpaceOptions<string>) {
        return new Space(
            { ...this.inputs.dictionary, ...extensions },
            deepMerge(this.inputs.options, overrides)
        ) as any
    }

    get types() {
        return Common.chainableNoOp
    }
}

export class Resolution extends Branch<string> {
    constructor(
        private aliasDef: string,
        private resolutionDef: unknown,
        ctx: Common.ParseContext
    ) {
        super(aliasDef, ctx)
    }

    parse() {
        return Root.parse(this.resolutionDef, this.ctx)
    }

    allows(args: Common.AllowsArgs) {
        this.next().allows(this.nextArgs(args))
        const customValidator =
            args.ctx.config.validator ?? this.ctx.config.validate?.validator
        if (customValidator) {
            // Only provide errors that occured starting at the resolution path to its custom validator
            const defaultErrorsUnderPath: Common.ErrorsByPath =
                Object.fromEntries(
                    Object.entries(args.errors).filter(([path]) =>
                        path.startsWith(args.ctx.valuePath)
                    )
                )
            const customErrors = Common.getErrorsFromCustomValidator(
                customValidator,
                {
                    ...args,
                    errors: defaultErrorsUnderPath,
                    def: this.def
                }
            )
            // Remove the original errors under this validation path
            for (const path in defaultErrorsUnderPath) {
                delete args.errors[path]
            }
            Object.assign(args.errors, customErrors)
        }
    }

    generate(args: Common.GenerateArgs) {
        if (args.ctx.seen.includes(this.aliasDef)) {
            if (args.ctx.config.onRequiredCycle) {
                return args.ctx.config.onRequiredCycle
            }
            throw new Common.RequiredCycleError(this.aliasDef, args.ctx.seen)
        }
        return this.next().generate(this.nextArgs(args))
    }

    private nextArgs<Args extends { ctx: Common.MethodContext<any> }>(
        args: Args
    ): Args {
        return {
            ...args,
            ctx: {
                ...args.ctx,
                seen: [...args.ctx.seen, this.aliasDef],
                shallowSeen: [...args.ctx.shallowSeen, this.aliasDef]
            }
        }
    }
}

export type MetaKey = "onCycle" | "onResolve"

export type DictionaryToModels<Dict> = Evaluate<{
    [TypeName in Exclude<keyof Dict, MetaKey>]: ModelFrom<
        Dict[TypeName],
        Root.Parse<Dict[TypeName], Dict, { [K in TypeName]: true }>
    >
}>

export interface SpaceOptions<ModelName extends string>
    extends Common.BaseOptions {
    models?: { [K in ModelName]?: Common.BaseOptions }
}

type ModelNameIn<Dict> = keyof Dict & string

interface SpaceExtensionOptions<
    BaseModelName extends string,
    ExtensionModelName extends string
> extends Common.BaseOptions {
    models?: {
        [ModelName in BaseModelName | ExtensionModelName]?: Common.BaseOptions
    }
}

interface SpaceConfig extends SpaceOptions<any> {
    onCycle?: unknown
    onResolve?: unknown
}

type SpaceDictionary = Record<string, unknown>

type ValidateDictionaryExtension<BaseDict, ExtensionDict> = {
    [TypeName in keyof ExtensionDict]: Root.Validate<
        ExtensionDict[TypeName],
        Merge<BaseDict, ExtensionDict>
    >
}

export type ExtendFunction<BaseDict> = <ExtensionDict>(
    dictionary: ValidateDictionaryExtension<BaseDict, ExtensionDict>,
    config?: SpaceExtensionOptions<
        ModelNameIn<BaseDict>,
        ModelNameIn<ExtensionDict>
    >
) => SpaceFrom<Merge<BaseDict, ExtensionDict>>

export type DictToTypes<Dict> = Evaluate<{
    [TypeName in Exclude<keyof Dict, MetaKey>]: Root.Parse<
        Dict[TypeName],
        Dict,
        { [K in TypeName]: true }
    >
}>

export type ValidateDictionary<Dict> = {
    [TypeName in keyof Dict]: Root.Validate<Dict[TypeName], Dict>
}

export type CompileFunction = <Dict>(
    dictionary: ValidateDictionary<Dict>,
    options?: SpaceOptions<ModelNameIn<Dict>>
) => SpaceFrom<Dict>

export type SpaceFrom<Dict> = {
    models: DictionaryToModels<Dict>
    types: DictToTypes<Dict>
    extend: ExtendFunction<Dict>
    create: ModelFunction<Dict>
    inputs: {
        dictionary: Dict
        options: SpaceOptions<ModelNameIn<Dict>> | undefined
    }
}

const normalizeSpaceInputs = (
    dictionary: any,
    options: SpaceOptions<string> = {}
) => {
    const { onCycle, onResolve, ...modelDefinitions } = dictionary
    const { models = {}, ...config } = options as SpaceConfig
    if (onCycle) {
        config.onCycle = onCycle
    }
    if (onResolve) {
        config.onResolve = onResolve
    }
    return {
        modelConfigs: models as Record<string, Common.BaseOptions>,
        modelDefinitionEntries: Object.entries(modelDefinitions),
        config
    }
}
