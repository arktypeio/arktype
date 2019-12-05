import * as photon from "@prisma/photon"
import { core } from "nexus"
// Types helpers
type IsModelNameExistsInGraphQLTypes<
    ReturnType extends any
> = ReturnType extends core.GetGen<"objectNames"> ? true : false

type NexusPrismaScalarOpts = {
    alias?: string
}

type Pagination = {
    first?: boolean
    last?: boolean
    before?: boolean
    after?: boolean
    skip?: boolean
}

type RootObjectTypes = Pick<
    core.GetGen<"rootTypes">,
    core.GetGen<"objectNames">
>

/**
 * Determine if `B` is a subset (or equivalent to) of `A`.
 */
type IsSubset<A, B> = keyof A extends never ? false : B extends A ? true : false

type OmitByValue<T, ValueType> = Pick<
    T,
    { [Key in keyof T]: T[Key] extends ValueType ? never : Key }[keyof T]
>

type GetSubsetTypes<ModelName extends any> = keyof OmitByValue<
    {
        [P in keyof RootObjectTypes]: ModelName extends keyof ModelTypes
            ? IsSubset<RootObjectTypes[P], ModelTypes[ModelName]> extends true
                ? RootObjectTypes[P]
                : never
            : never
    },
    never
>

type SubsetTypes<ModelName extends any> = GetSubsetTypes<
    ModelName
> extends never
    ? `ERROR: No subset types are available. Please make sure that one of your GraphQL type is a subset of your t.model('<ModelName>')`
    : GetSubsetTypes<ModelName>

type DynamicRequiredType<
    ReturnType extends any
> = IsModelNameExistsInGraphQLTypes<ReturnType> extends true
    ? { type?: SubsetTypes<ReturnType> }
    : { type: SubsetTypes<ReturnType> }

type GetNexusPrismaInput<
    ModelName extends any,
    MethodName extends any,
    InputName extends "filtering" | "ordering"
> = ModelName extends keyof NexusPrismaInputs
    ? MethodName extends keyof NexusPrismaInputs[ModelName]
        ? NexusPrismaInputs[ModelName][MethodName][InputName]
        : never
    : never

type ContextArgs = Record<string, (ctx: any) => any>

type NexusPrismaRelationOpts<
    ModelName extends any,
    MethodName extends any,
    ReturnType extends any
> = GetNexusPrismaInput<
    // If GetNexusPrismaInput returns never, it means there are no filtering/ordering args for it. So just use `alias` and `type`
    ModelName,
    MethodName,
    "filtering"
> extends never
    ? {
          alias?: string
          contextArgs?: ContextArgs
      } & DynamicRequiredType<ReturnType>
    : {
          alias?: string
          contextArgs?: ContextArgs
          filtering?:
              | boolean
              | Partial<
                    Record<
                        GetNexusPrismaInput<ModelName, MethodName, "filtering">,
                        boolean
                    >
                >
          ordering?:
              | boolean
              | Partial<
                    Record<
                        GetNexusPrismaInput<ModelName, MethodName, "ordering">,
                        boolean
                    >
                >
          pagination?: boolean | Pagination
      } & DynamicRequiredType<ReturnType>

type IsScalar<TypeName extends any> = TypeName extends core.GetGen<
    "scalarNames"
>
    ? true
    : false

type IsObject<Name extends any> = Name extends core.GetGen<"objectNames">
    ? true
    : false

type IsEnum<Name extends any> = Name extends core.GetGen<"enumNames">
    ? true
    : false

type IsInputObject<Name extends any> = Name extends core.GetGen<"inputNames">
    ? true
    : false

/**
 * The kind that a GraphQL type may be.
 */
type Kind = "Enum" | "Object" | "Scalar" | "InputObject"

/**
 * Helper to safely reference a Kind type. For example instead of the following
 * which would admit a typo:
 *
 * ```ts
 * type Foo = Bar extends 'scalar' ? ...
 * ```
 *
 * You can do this which guarantees a correct reference:
 *
 * ```ts
 * type Foo = Bar extends AKind<'Scalar'> ? ...
 * ```
 *
 */
type AKind<T extends Kind> = T

type GetKind<Name extends any> = IsEnum<Name> extends true
    ? "Enum"
    : IsScalar<Name> extends true
    ? "Scalar"
    : IsObject<Name> extends true
    ? "Object"
    : IsInputObject<Name> extends true
    ? "InputObject"
    : // FIXME should be `never`, but GQL objects named differently
      // than backing type fall into this branch
      "Object"

type NexusPrismaFields<ModelName extends keyof NexusPrismaTypes> = {
    [MethodName in keyof NexusPrismaTypes[ModelName]]: NexusPrismaMethod<
        ModelName,
        MethodName,
        GetKind<NexusPrismaTypes[ModelName][MethodName]> // Is the return type a scalar?
    >
}

type NexusPrismaMethod<
    ModelName extends keyof NexusPrismaTypes,
    MethodName extends keyof NexusPrismaTypes[ModelName],
    ThisKind extends Kind,
    ReturnType extends any = NexusPrismaTypes[ModelName][MethodName]
> = ThisKind extends AKind<"Enum">
    ? () => NexusPrismaFields<ModelName>
    : ThisKind extends AKind<"Scalar">
    ? (opts?: NexusPrismaScalarOpts) => NexusPrismaFields<ModelName> // Return optional scalar opts
    : IsModelNameExistsInGraphQLTypes<ReturnType> extends true // If model name has a mapped graphql types
    ? (
          opts?: NexusPrismaRelationOpts<ModelName, MethodName, ReturnType>
      ) => NexusPrismaFields<ModelName> // Then make opts optional
    : (
          opts: NexusPrismaRelationOpts<ModelName, MethodName, ReturnType>
      ) => NexusPrismaFields<ModelName> // Else force use input the related graphql type -> { type: '...' }

type GetNexusPrismaMethod<
    TypeName extends string
> = TypeName extends keyof NexusPrismaMethods
    ? NexusPrismaMethods[TypeName]
    : <CustomTypeName extends keyof ModelTypes>(
          typeName: CustomTypeName
      ) => NexusPrismaMethods[CustomTypeName]

type GetNexusPrisma<
    TypeName extends string,
    ModelOrCrud extends "model" | "crud"
> = ModelOrCrud extends "model"
    ? TypeName extends "Mutation"
        ? never
        : TypeName extends "Query"
        ? never
        : GetNexusPrismaMethod<TypeName>
    : ModelOrCrud extends "crud"
    ? TypeName extends "Mutation"
        ? GetNexusPrismaMethod<TypeName>
        : TypeName extends "Query"
        ? GetNexusPrismaMethod<TypeName>
        : never
    : never

// Generated
interface ModelTypes {
    Tag: photon.Tag
    Selector: photon.Selector
    Step: photon.Step
    Test: photon.Test
    User: photon.User
}

interface NexusPrismaInputs {
    Query: {
        tags: {
            filtering: "id" | "name" | "AND" | "OR" | "NOT" | "user" | "test"
            ordering: "id" | "name"
        }
        selectors: {
            filtering: "id" | "css" | "steps" | "AND" | "OR" | "NOT" | "user"
            ordering: "id" | "css"
        }
        steps: {
            filtering:
                | "id"
                | "action"
                | "value"
                | "AND"
                | "OR"
                | "NOT"
                | "user"
                | "selector"
                | "test"
            ordering: "id" | "action" | "value"
        }
        tests: {
            filtering:
                | "id"
                | "name"
                | "steps"
                | "tags"
                | "AND"
                | "OR"
                | "NOT"
                | "user"
            ordering: "id" | "name"
        }
        users: {
            filtering:
                | "id"
                | "email"
                | "password"
                | "first"
                | "last"
                | "steps"
                | "selectors"
                | "tags"
                | "tests"
                | "AND"
                | "OR"
                | "NOT"
            ordering: "id" | "email" | "password" | "first" | "last"
        }
    }
    Tag: {}
    Selector: {
        steps: {
            filtering:
                | "id"
                | "action"
                | "value"
                | "AND"
                | "OR"
                | "NOT"
                | "user"
                | "selector"
                | "test"
            ordering: "id" | "action" | "value"
        }
    }
    Step: {}
    Test: {
        steps: {
            filtering:
                | "id"
                | "action"
                | "value"
                | "AND"
                | "OR"
                | "NOT"
                | "user"
                | "selector"
                | "test"
            ordering: "id" | "action" | "value"
        }
        tags: {
            filtering: "id" | "name" | "AND" | "OR" | "NOT" | "user" | "test"
            ordering: "id" | "name"
        }
    }
    User: {
        steps: {
            filtering:
                | "id"
                | "action"
                | "value"
                | "AND"
                | "OR"
                | "NOT"
                | "user"
                | "selector"
                | "test"
            ordering: "id" | "action" | "value"
        }
        selectors: {
            filtering: "id" | "css" | "steps" | "AND" | "OR" | "NOT" | "user"
            ordering: "id" | "css"
        }
        tags: {
            filtering: "id" | "name" | "AND" | "OR" | "NOT" | "user" | "test"
            ordering: "id" | "name"
        }
        tests: {
            filtering:
                | "id"
                | "name"
                | "steps"
                | "tags"
                | "AND"
                | "OR"
                | "NOT"
                | "user"
            ordering: "id" | "name"
        }
    }
}

interface NexusPrismaTypes {
    Query: {
        tag: "Tag"
        tags: "Tag"
        selector: "Selector"
        selectors: "Selector"
        step: "Step"
        steps: "Step"
        test: "Test"
        tests: "Test"
        user: "User"
        users: "User"
    }
    Mutation: {
        createOneTag: "Tag"
        updateOneTag: "Tag"
        updateManyTag: "BatchPayload"
        deleteOneTag: "Tag"
        deleteManyTag: "BatchPayload"
        upsertOneTag: "Tag"
        createOneSelector: "Selector"
        updateOneSelector: "Selector"
        updateManySelector: "BatchPayload"
        deleteOneSelector: "Selector"
        deleteManySelector: "BatchPayload"
        upsertOneSelector: "Selector"
        createOneStep: "Step"
        updateOneStep: "Step"
        updateManyStep: "BatchPayload"
        deleteOneStep: "Step"
        deleteManyStep: "BatchPayload"
        upsertOneStep: "Step"
        createOneTest: "Test"
        updateOneTest: "Test"
        updateManyTest: "BatchPayload"
        deleteOneTest: "Test"
        deleteManyTest: "BatchPayload"
        upsertOneTest: "Test"
        createOneUser: "User"
        updateOneUser: "User"
        updateManyUser: "BatchPayload"
        deleteOneUser: "User"
        deleteManyUser: "BatchPayload"
        upsertOneUser: "User"
    }
    Tag: {
        id: "Int"
        user: "User"
        name: "String"
        test: "Test"
    }
    Selector: {
        id: "Int"
        user: "User"
        css: "String"
        steps: "Step"
    }
    Step: {
        id: "Int"
        user: "User"
        action: "String"
        selector: "Selector"
        value: "String"
        test: "Test"
    }
    Test: {
        id: "Int"
        user: "User"
        name: "String"
        steps: "Step"
        tags: "Tag"
    }
    User: {
        id: "Int"
        email: "String"
        password: "String"
        first: "String"
        last: "String"
        steps: "Step"
        selectors: "Selector"
        tags: "Tag"
        tests: "Test"
    }
}

interface NexusPrismaMethods {
    Tag: NexusPrismaFields<"Tag">
    Selector: NexusPrismaFields<"Selector">
    Step: NexusPrismaFields<"Step">
    Test: NexusPrismaFields<"Test">
    User: NexusPrismaFields<"User">
    Query: NexusPrismaFields<"Query">
    Mutation: NexusPrismaFields<"Mutation">
}

declare global {
    type NexusPrisma<
        TypeName extends string,
        ModelOrCrud extends "model" | "crud"
    > = GetNexusPrisma<TypeName, ModelOrCrud>
}

declare global {
    interface NexusGenCustomOutputProperties<TypeName extends string> {
        crud: NexusPrisma<TypeName, "crud">
        model: NexusPrisma<TypeName, "model">
    }
}

declare global {
    interface NexusGen extends NexusGenTypes {}
}

export interface NexusGenInputs {
    SelectorCreateOneWithoutSelectorInput: {
        // input type
        connect?: NexusGenInputs["SelectorWhereUniqueInput"] | null // SelectorWhereUniqueInput
        create?: NexusGenInputs["SelectorCreateWithoutStepsInput"] | null // SelectorCreateWithoutStepsInput
    }
    SelectorCreateWithoutStepsInput: {
        // input type
        css: string // String!
    }
    SelectorWhereUniqueInput: {
        // input type
        id?: number | null // Int
    }
    SignInInput: {
        // input type
        email: string // String!
        password: string // String!
    }
    SignUpInput: {
        // input type
        email: string // String!
        first: string // String!
        last: string // String!
        password: string // String!
    }
    StepCreateManyWithoutStepsInput: {
        // input type
        connect?: NexusGenInputs["StepWhereUniqueInput"][] | null // [StepWhereUniqueInput!]
        create?: NexusGenInputs["StepCreateWithoutUserInput"][] | null // [StepCreateWithoutUserInput!]
    }
    StepCreateWithoutUserInput: {
        // input type
        action: string // String!
        selector: NexusGenInputs["SelectorCreateOneWithoutSelectorInput"] // SelectorCreateOneWithoutSelectorInput!
        test?: NexusGenInputs["TestCreateOneWithoutTestInput"] | null // TestCreateOneWithoutTestInput
        value: string // String!
    }
    StepWhereUniqueInput: {
        // input type
        id?: number | null // Int
    }
    TagCreateManyWithoutTagsInput: {
        // input type
        connect?: NexusGenInputs["TagWhereUniqueInput"][] | null // [TagWhereUniqueInput!]
        create?: NexusGenInputs["TagCreateWithoutTestInput"][] | null // [TagCreateWithoutTestInput!]
    }
    TagCreateWithoutTestInput: {
        // input type
        name: string // String!
    }
    TagWhereUniqueInput: {
        // input type
        id?: number | null // Int
    }
    TestCreateInput: {
        // input type
        name: string // String!
        steps?: NexusGenInputs["StepCreateManyWithoutStepsInput"] | null // StepCreateManyWithoutStepsInput
        tags?: NexusGenInputs["TagCreateManyWithoutTagsInput"] | null // TagCreateManyWithoutTagsInput
    }
    TestCreateOneWithoutTestInput: {
        // input type
        connect?: NexusGenInputs["TestWhereUniqueInput"] | null // TestWhereUniqueInput
        create?: NexusGenInputs["TestCreateWithoutStepsInput"] | null // TestCreateWithoutStepsInput
    }
    TestCreateWithoutStepsInput: {
        // input type
        name: string // String!
        tags?: NexusGenInputs["TagCreateManyWithoutTagsInput"] | null // TagCreateManyWithoutTagsInput
    }
    TestWhereUniqueInput: {
        // input type
        id?: number | null // Int
    }
    UserWhereUniqueInput: {
        // input type
        email?: string | null // String
        id?: number | null // Int
    }
}

export interface NexusGenEnums {}

export interface NexusGenRootTypes {
    Mutation: {}
    Query: {}
    Selector: photon.Selector
    Step: photon.Step
    Tag: photon.Tag
    Test: photon.Test
    User: photon.User
    String: string
    Int: number
    Float: number
    Boolean: boolean
    ID: string
}

export interface NexusGenAllTypes extends NexusGenRootTypes {
    SelectorCreateOneWithoutSelectorInput: NexusGenInputs["SelectorCreateOneWithoutSelectorInput"]
    SelectorCreateWithoutStepsInput: NexusGenInputs["SelectorCreateWithoutStepsInput"]
    SelectorWhereUniqueInput: NexusGenInputs["SelectorWhereUniqueInput"]
    SignInInput: NexusGenInputs["SignInInput"]
    SignUpInput: NexusGenInputs["SignUpInput"]
    StepCreateManyWithoutStepsInput: NexusGenInputs["StepCreateManyWithoutStepsInput"]
    StepCreateWithoutUserInput: NexusGenInputs["StepCreateWithoutUserInput"]
    StepWhereUniqueInput: NexusGenInputs["StepWhereUniqueInput"]
    TagCreateManyWithoutTagsInput: NexusGenInputs["TagCreateManyWithoutTagsInput"]
    TagCreateWithoutTestInput: NexusGenInputs["TagCreateWithoutTestInput"]
    TagWhereUniqueInput: NexusGenInputs["TagWhereUniqueInput"]
    TestCreateInput: NexusGenInputs["TestCreateInput"]
    TestCreateOneWithoutTestInput: NexusGenInputs["TestCreateOneWithoutTestInput"]
    TestCreateWithoutStepsInput: NexusGenInputs["TestCreateWithoutStepsInput"]
    TestWhereUniqueInput: NexusGenInputs["TestWhereUniqueInput"]
    UserWhereUniqueInput: NexusGenInputs["UserWhereUniqueInput"]
}

export interface NexusGenFieldTypes {
    Mutation: {
        // field return type
        createOneTest: NexusGenRootTypes["Test"] // Test!
        signIn: string // String!
        signUp: string // String!
    }
    Query: {
        // field return type
        selector: NexusGenRootTypes["Selector"] | null // Selector
        selectors: NexusGenRootTypes["Selector"][] // [Selector!]!
        step: NexusGenRootTypes["Step"] | null // Step
        steps: NexusGenRootTypes["Step"][] // [Step!]!
        tag: NexusGenRootTypes["Tag"] | null // Tag
        tags: NexusGenRootTypes["Tag"][] // [Tag!]!
        test: NexusGenRootTypes["Test"] | null // Test
        tests: NexusGenRootTypes["Test"][] // [Test!]!
        user: NexusGenRootTypes["User"] | null // User
        users: NexusGenRootTypes["User"][] // [User!]!
    }
    Selector: {
        // field return type
        css: string // String!
        id: number // Int!
    }
    Step: {
        // field return type
        action: string // String!
        id: number // Int!
        selector: NexusGenRootTypes["Selector"] // Selector!
        value: string // String!
    }
    Tag: {
        // field return type
        id: number // Int!
        name: string // String!
    }
    Test: {
        // field return type
        id: number // Int!
        name: string // String!
        steps: NexusGenRootTypes["Step"][] // [Step!]!
        tags: NexusGenRootTypes["Tag"][] // [Tag!]!
    }
    User: {
        // field return type
        email: string // String!
        first: string // String!
        id: number // Int!
        last: string // String!
        password: string // String!
        selectors: NexusGenRootTypes["Selector"][] // [Selector!]!
        steps: NexusGenRootTypes["Step"][] // [Step!]!
        tags: NexusGenRootTypes["Tag"][] // [Tag!]!
        tests: NexusGenRootTypes["Test"][] // [Test!]!
    }
}

export interface NexusGenArgTypes {
    Mutation: {
        createOneTest: {
            // args
            data: NexusGenInputs["TestCreateInput"] // TestCreateInput!
        }
        signIn: {
            // args
            data: NexusGenInputs["SignInInput"] // SignInInput!
        }
        signUp: {
            // args
            data: NexusGenInputs["SignUpInput"] // SignUpInput!
        }
    }
    Query: {
        selector: {
            // args
            where: NexusGenInputs["SelectorWhereUniqueInput"] // SelectorWhereUniqueInput!
        }
        selectors: {
            // args
            after?: number | null // Int
            before?: number | null // Int
            first?: number | null // Int
            last?: number | null // Int
            skip?: number | null // Int
        }
        step: {
            // args
            where: NexusGenInputs["StepWhereUniqueInput"] // StepWhereUniqueInput!
        }
        steps: {
            // args
            after?: number | null // Int
            before?: number | null // Int
            first?: number | null // Int
            last?: number | null // Int
            skip?: number | null // Int
        }
        tag: {
            // args
            where: NexusGenInputs["TagWhereUniqueInput"] // TagWhereUniqueInput!
        }
        tags: {
            // args
            after?: number | null // Int
            before?: number | null // Int
            first?: number | null // Int
            last?: number | null // Int
            skip?: number | null // Int
        }
        test: {
            // args
            where: NexusGenInputs["TestWhereUniqueInput"] // TestWhereUniqueInput!
        }
        tests: {
            // args
            after?: number | null // Int
            before?: number | null // Int
            first?: number | null // Int
            last?: number | null // Int
            skip?: number | null // Int
        }
        user: {
            // args
            where: NexusGenInputs["UserWhereUniqueInput"] // UserWhereUniqueInput!
        }
        users: {
            // args
            after?: number | null // Int
            before?: number | null // Int
            first?: number | null // Int
            last?: number | null // Int
            skip?: number | null // Int
        }
    }
    Test: {
        steps: {
            // args
            after?: number | null // Int
            before?: number | null // Int
            first?: number | null // Int
            last?: number | null // Int
            skip?: number | null // Int
        }
        tags: {
            // args
            after?: number | null // Int
            before?: number | null // Int
            first?: number | null // Int
            last?: number | null // Int
            skip?: number | null // Int
        }
    }
    User: {
        selectors: {
            // args
            after?: number | null // Int
            before?: number | null // Int
            first?: number | null // Int
            last?: number | null // Int
            skip?: number | null // Int
        }
        steps: {
            // args
            after?: number | null // Int
            before?: number | null // Int
            first?: number | null // Int
            last?: number | null // Int
            skip?: number | null // Int
        }
        tags: {
            // args
            after?: number | null // Int
            before?: number | null // Int
            first?: number | null // Int
            last?: number | null // Int
            skip?: number | null // Int
        }
        tests: {
            // args
            after?: number | null // Int
            before?: number | null // Int
            first?: number | null // Int
            last?: number | null // Int
            skip?: number | null // Int
        }
    }
}

export interface NexusGenAbstractResolveReturnTypes {}

export interface NexusGenInheritedFields {}

export type NexusGenObjectNames =
    | "Mutation"
    | "Query"
    | "Selector"
    | "Step"
    | "Tag"
    | "Test"
    | "User"

export type NexusGenInputNames =
    | "SelectorCreateOneWithoutSelectorInput"
    | "SelectorCreateWithoutStepsInput"
    | "SelectorWhereUniqueInput"
    | "SignInInput"
    | "SignUpInput"
    | "StepCreateManyWithoutStepsInput"
    | "StepCreateWithoutUserInput"
    | "StepWhereUniqueInput"
    | "TagCreateManyWithoutTagsInput"
    | "TagCreateWithoutTestInput"
    | "TagWhereUniqueInput"
    | "TestCreateInput"
    | "TestCreateOneWithoutTestInput"
    | "TestCreateWithoutStepsInput"
    | "TestWhereUniqueInput"
    | "UserWhereUniqueInput"

export type NexusGenEnumNames = never

export type NexusGenInterfaceNames = never

export type NexusGenScalarNames = "Boolean" | "Float" | "ID" | "Int" | "String"

export type NexusGenUnionNames = never

export interface NexusGenTypes {
    context: Context.Context
    inputTypes: NexusGenInputs
    rootTypes: NexusGenRootTypes
    argTypes: NexusGenArgTypes
    fieldTypes: NexusGenFieldTypes
    allTypes: NexusGenAllTypes
    inheritedFields: NexusGenInheritedFields
    objectNames: NexusGenObjectNames
    inputNames: NexusGenInputNames
    enumNames: NexusGenEnumNames
    interfaceNames: NexusGenInterfaceNames
    scalarNames: NexusGenScalarNames
    unionNames: NexusGenUnionNames
    allInputTypes:
        | NexusGenTypes["inputNames"]
        | NexusGenTypes["enumNames"]
        | NexusGenTypes["scalarNames"]
    allOutputTypes:
        | NexusGenTypes["objectNames"]
        | NexusGenTypes["enumNames"]
        | NexusGenTypes["unionNames"]
        | NexusGenTypes["interfaceNames"]
        | NexusGenTypes["scalarNames"]
    allNamedTypes:
        | NexusGenTypes["allInputTypes"]
        | NexusGenTypes["allOutputTypes"]
    abstractTypes: NexusGenTypes["interfaceNames"] | NexusGenTypes["unionNames"]
    abstractResolveReturn: NexusGenAbstractResolveReturnTypes
}

declare global {
    interface NexusGenPluginTypeConfig<TypeName extends string> {}
    interface NexusGenPluginFieldConfig<
        TypeName extends string,
        FieldName extends string
    > {}
    interface NexusGenPluginSchemaConfig {}
}
export type Selector = photon.Selector
export type Step = photon.Step
export type Tag = photon.Tag
export type Test = photon.Test
export type User = photon.User
