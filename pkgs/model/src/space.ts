import { diffSets, Evaluate, transform } from "@re-/tools"
import {
    createCreateFunction,
    Model,
    ModelConfig,
    CreateFunction,
    BaseConfig
} from "./model.js"
import { Root } from "./definitions/index.js"
import { typeDefProxy, Merge } from "./internal.js"

export type MetaKey = "onCycle" | "onResolve"

export type DictionaryToModels<Dict> = Evaluate<{
    [TypeName in Exclude<keyof Dict, MetaKey>]: Model<
        Dict[TypeName],
        Root.FastParse<Dict[TypeName], Dict, { [K in TypeName]: true }>
    >
}>

export const compile: CompileFunction = (dictionary: any, config: any = {}) => {
    if (config.declaredTypeNames) {
        const declarationErrors = diffSets(
            config.declaredTypeNames,
            Object.keys(dictionary)
        )
        if (declarationErrors) {
            const errorParts = [] as string[]
            if (declarationErrors.added) {
                errorParts.push(
                    `Defined types ${declarationErrors.added
                        .map((_) => `'${_}'`)
                        .join(", ")} were never declared.`
                )
            }
            if (declarationErrors.removed) {
                errorParts.push(
                    `Declared types ${declarationErrors.removed
                        .map((_) => `'${_}'`)
                        .join(", ")} were never defined.`
                )
            }
            throw new Error(errorParts.join(" "))
        }
    }
    const create = createCreateFunction({ dictionary, config })
    const extend = (newDefinitions: any, newConfig: any) =>
        // @ts-ignore
        compile(
            { ...dictionary, ...newDefinitions },
            {
                ...config,
                ...newConfig,
                models: { ...config?.models, ...newConfig?.models }
            }
        )
    return {
        dictionary,
        config,
        models: transform(dictionary, ([typeName, definition]) => [
            typeName,
            // @ts-ignore
            create(definition, { ...config, ...config?.models?.[typeName] })
        ]),
        types: typeDefProxy,
        create,
        extend
    } as any
}

export interface SpaceConfig<ModelName extends string> extends BaseConfig {
    models?: { [K in ModelName]?: ModelConfig }
}

export type ExtendFunction<BaseDict> = <Dict>(
    dictionary: ValidateDictionary<Dict>,
    config?: SpaceConfig<(keyof Dict | keyof BaseDict) & string>
) => Space<Merge<BaseDict, Dict>>

export type SpaceDefinition = {
    dictionary: Record<string, any>
    config?: SpaceConfig<string>
}

export type DictToTypes<Dict> = Evaluate<{
    [TypeName in Exclude<keyof Dict, MetaKey>]: Root.FastParse<
        Dict[TypeName],
        Dict,
        { [K in TypeName]: true }
    >
}>

export type Space<Dict> = {
    models: DictionaryToModels<Dict>
    config: SpaceConfig<keyof Dict & string>
    types: DictToTypes<Dict>
    dictionary: Dict
    create: CreateFunction<Dict>
    extend: ExtendFunction<Dict>
}

export type ValidateDictionary<Dict> = {
    [TypeName in keyof Dict]: Root.FastValidate<Dict[TypeName], Dict>
}

export type CompileFunction = <Dict>(
    dictionary: ValidateDictionary<Dict>,
    config?: SpaceConfig<keyof Dict & string>
) => Space<Dict>

const space = compile({
    a: {
        ok: "string"
    },
    b: {
        cool: "number|bigint"
    },
    c: { a: ["string", "number"] }
}).extend({ a: "string", d: ["string", "number"] })
