import { deepMerge, EntriesOf, Evaluate, Merge } from "@re-/tools"
import { model, Model, ModelFrom, ModelFunction } from "./model.js"
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
            this.resolutions[typeName] = new Resolution(
                typeName,
                definition,
                this
            )
            this.models[typeName] = new Model(
                this.resolutions[typeName],
                deepMerge(this.config, this.modelConfigs[typeName])
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
        return Common.typeDefProxy
    }
}

export class Resolution extends Branch<unknown> {
    config: Common.BaseOptions

    constructor(public readonly alias: string, def: unknown, space: Space) {
        const config = deepMerge(space.config, space.modelConfigs[alias])
        super(def, Common.createRootParseContext(config, space.resolutions))
        this.config = config
    }

    parse() {
        return Root.parse(this.def, this.ctx)
    }

    allows(args: Common.AllowsArgs) {
        this.next().allows({
            ...args,
            ctx: this.nextMethodContext(args.ctx)
        })
        const builtInErrorsAtPath: Common.ErrorsByPath = Object.fromEntries(
            Object.entries(args.errors).filter(([path]) =>
                path.startsWith(args.ctx.valuePath)
            )
        )
        const customValidator =
            args.ctx.config.validator ?? this.config.validate?.validator
        if (customValidator) {
            const customErrors = customValidator(
                args.value,
                builtInErrorsAtPath,
                args.ctx,
                this.alias
            )
            if (!customErrors) {
                return
            }
            if (typeof customErrors === "string") {
                this.addCustomUnassignable(args, customErrors)
            } else {
                Object.assign(args.errors, customErrors)
            }
        }
    }

    generate(args: Common.GenerateArgs) {
        if (args.ctx.seen.includes(this.alias)) {
            if (args.ctx.config.onRequiredCycle) {
                return args.ctx.config.onRequiredCycle
            }
            throw new Common.RequiredCycleError(this.alias, args.ctx.seen)
        }
        return this.next().generate({
            ...args,
            ctx: this.nextMethodContext(args.ctx)
        })
    }

    private nextMethodContext(
        ctx: Common.MethodContext<any>
    ): Common.MethodContext<any> {
        return {
            ...ctx,
            seen: [...ctx.seen, this.alias],
            shallowSeen: [...ctx.shallowSeen, this.alias]
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
