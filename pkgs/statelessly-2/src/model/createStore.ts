import {
    Narrow,
    Exact,
    TypeError,
    NonRecursible,
    Unlisted,
    KeyValuate,
    ExcludeCyclic
} from "@re-do/utils"
import {
    ParseType,
    ValidatedPropDef,
    DefinedTypeSet,
    TypeDefinition,
    ParseTypes
} from "./createTypes"
import { Object as ToolbeltObject } from "ts-toolbelt"

type TypeDefOnly<TypeDef extends string> = TypeDef

type ConfigWithType<TypeDef extends string> = {
    type: TypeDef
}

type ConfigWithFields<Fields extends object> = {
    fields: Fields
}

type ModelConfig<T, TypeSet, Config> = ModelConfigRecurse<
    T,
    false,
    false,
    never,
    TypeSet,
    Config
>

// type RootModelConfig<Definitions, TypeDef extends string> = {
//     type: ValidatedPropDef<keyof Definitions & string, TypeDef>
// } & ModelConfig<ParseType<Definitions, TypeDef>>

type ModelConfigRecurse<
    T,
    IsTyped extends boolean,
    InList extends boolean,
    Seen,
    TypeSet,
    Config
> = BaseModelConfigOptions<T, TypeSet, Config> &
    (Unlisted<T> extends NonRecursible | Seen
        ? {}
        : RecursibleModelConfigOptions<
              T,
              IsTyped,
              InList,
              Seen,
              TypeSet,
              Config
          >) &
    (InList extends false ? { idKey?: string } : {})

type ModelTypeOptions<
    TypeSet,
    Config,
    IsTyped extends boolean
> = IsTyped extends true
    ? {}
    : {
          type?: TypeDefinition<TypeSet, KeyValuate<Config, "type">>
      }

type BaseModelConfigOptions<T, TypeSet, Config> = {
    validate?: (_: T) => boolean
    onChange?: (updates: T, original: T) => void
}

type RecursibleModelConfigOptions<
    T,
    IsTyped extends boolean,
    InList extends boolean,
    Seen,
    TypeSet,
    Config
> = {
    fields?: {
        [K in keyof Unlisted<T>]?: ModelConfigRecurse<
            Unlisted<T>[K],
            Config extends ConfigWithType<string> ? true : IsTyped,
            T extends any[] ? true : InList,
            Seen | Unlisted<T>,
            TypeSet,
            KeyValuate<Config, K>
        >
    }
    defines?: string
}

export type ModelConfigs<TypeSet, Configs> = {
    [ModelPath in keyof Configs]: Configs[ModelPath] extends TypeDefOnly<
        infer TypeDef
    >
        ? ValidatedPropDef<keyof TypeSet & string, TypeDef>
        : Configs[ModelPath] extends ConfigWithType<infer TypeDef>
        ? Exact<
              Configs[ModelPath],
              ModelConfig<
                  ParseType<TypeSet, TypeDef>,
                  TypeSet,
                  Configs[ModelPath]
              >
          >
        : Configs[ModelPath] extends ConfigWithFields<infer TypeDef>
        ? Exact<
              Configs[ModelPath],
              ModelConfig<
                  ParseType<TypeSet, TypeDef>,
                  TypeSet,
                  Configs[ModelPath]
              >
          >
        : TypeError<{
              message: `Model configs must either be a type string (e.g. 'string[]' or 'user?') or a config object with such a value as its 'type' property.`
              key: ModelPath
              value: Configs[ModelPath]
          }>
}

const createStore = <
    Config
    // extends ModelConfigs<DefinedTypeSet<ModeledTypes<Config>>, Config>
>(
    config: Narrow<Config>
) => {
    return {} as ParseTypes<ModeledTypes<Config>>
}

const store = createStore({
    users: {
        defines: "user",
        fields: {
            name: "string",
            bestFriend: "user",
            friends: {
                type: "user[]"
            },
            groups: "group[]",
            nested: {
                fields: {
                    another: "string",
                    user: "user[]"
                }
            }
        }
    },
    groups: {
        defines: "group",
        fields: {
            name: "string",
            description: "string?",
            members: "user[]",
            owner: "user"
        }
        // idKey: "",
        // fields: {
        //     name: {
        //         onChange: (_) => console.log(_)
        //     },
        //     members: {
        //         onChange: (updated, original) => {},
        //         fields: {
        //             groups: {}
        //         }
        //     }
        // },
        // onChange: (groups) => console.log(groups.map((_) => _.name).join(","))
    }
})

type DefinedConfig<DefinedType extends string> = {
    defines: DefinedType
}

type ModeledTypeNames<Configs> = ToolbeltObject.Invert<
    {
        [ModelPath in keyof Configs]: Configs[ModelPath] extends DefinedConfig<
            infer DefinedType
        >
            ? DefinedType
            : never
    }
>

type UpfilterTypes<Config> = Config extends TypeDefOnly<infer TypeDef>
    ? TypeDef
    : Config extends ConfigWithType<infer TypeDef>
    ? TypeDef
    : Config extends ConfigWithFields<infer Fields>
    ? {
          [K in keyof Fields]: UpfilterTypes<Fields[K]>
      }
    : never

type ModeledTypes<Configs> = {
    [TypeName in keyof ModeledTypeNames<Configs>]: UpfilterTypes<
        KeyValuate<Configs, ModeledTypeNames<Configs>[TypeName]>
    >
}
