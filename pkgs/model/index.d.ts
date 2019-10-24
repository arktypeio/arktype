import * as photon from "./@generated/photon"
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
      } & DynamicRequiredType<ReturnType>
    : {
          alias?: string
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
    ? "InputObject" // FIXME should be `never`, but GQL objects named differently
    : // than backing type fall into this branch
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
                | "selector"
                | "test"
                | "user"
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
                | "firstName"
                | "lastName"
                | "selectors"
                | "steps"
                | "tests"
                | "tags"
                | "AND"
                | "OR"
                | "NOT"
            ordering: "id" | "email" | "password" | "firstName" | "lastName"
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
                | "selector"
                | "test"
                | "user"
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
                | "selector"
                | "test"
                | "user"
            ordering: "id" | "action" | "value"
        }
        tags: {
            filtering: "id" | "name" | "AND" | "OR" | "NOT" | "user" | "test"
            ordering: "id" | "name"
        }
    }
    User: {
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
                | "selector"
                | "test"
                | "user"
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
        tags: {
            filtering: "id" | "name" | "AND" | "OR" | "NOT" | "user" | "test"
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
        name: "String"
        user: "User"
        test: "Test"
    }
    Selector: {
        id: "Int"
        css: "String"
        steps: "Step"
        user: "User"
    }
    Step: {
        id: "Int"
        action: "String"
        selector: "Selector"
        value: "String"
        test: "Test"
        user: "User"
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
        firstName: "String"
        lastName: "String"
        selectors: "Selector"
        steps: "Step"
        tests: "Test"
        tags: "Tag"
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
    SelectorCreateInput: {
        // input type
        css: string // String!
        steps?: NexusGenInputs["StepCreateManyWithoutStepsInput"] | null // StepCreateManyWithoutStepsInput
        user?: NexusGenInputs["UserCreateOneWithoutUserInput"] | null // UserCreateOneWithoutUserInput
    }
    SelectorCreateManyWithoutSelectorsInput: {
        // input type
        connect?: NexusGenInputs["SelectorWhereUniqueInput"][] | null // [SelectorWhereUniqueInput!]
        create?: NexusGenInputs["SelectorCreateWithoutUserInput"][] | null // [SelectorCreateWithoutUserInput!]
    }
    SelectorCreateOneWithoutSelectorInput: {
        // input type
        connect?: NexusGenInputs["SelectorWhereUniqueInput"] | null // SelectorWhereUniqueInput
        create?: NexusGenInputs["SelectorCreateWithoutStepsInput"] | null // SelectorCreateWithoutStepsInput
    }
    SelectorCreateWithoutStepsInput: {
        // input type
        css: string // String!
        user?: NexusGenInputs["UserCreateOneWithoutUserInput"] | null // UserCreateOneWithoutUserInput
    }
    SelectorCreateWithoutUserInput: {
        // input type
        css: string // String!
        steps?: NexusGenInputs["StepCreateManyWithoutStepsInput"] | null // StepCreateManyWithoutStepsInput
    }
    SelectorWhereUniqueInput: {
        // input type
        id?: number | null // Int
    }
    StepCreateInput: {
        // input type
        action: string // String!
        selector: NexusGenInputs["SelectorCreateOneWithoutSelectorInput"] // SelectorCreateOneWithoutSelectorInput!
        test?: NexusGenInputs["TestCreateOneWithoutTestInput"] | null // TestCreateOneWithoutTestInput
        user?: NexusGenInputs["UserCreateOneWithoutUserInput"] | null // UserCreateOneWithoutUserInput
        value: string // String!
    }
    StepCreateManyWithoutStepsInput: {
        // input type
        connect?: NexusGenInputs["StepWhereUniqueInput"][] | null // [StepWhereUniqueInput!]
        create?: NexusGenInputs["StepCreateWithoutSelectorInput"][] | null // [StepCreateWithoutSelectorInput!]
    }
    StepCreateWithoutSelectorInput: {
        // input type
        action: string // String!
        test?: NexusGenInputs["TestCreateOneWithoutTestInput"] | null // TestCreateOneWithoutTestInput
        user?: NexusGenInputs["UserCreateOneWithoutUserInput"] | null // UserCreateOneWithoutUserInput
        value: string // String!
    }
    StepWhereUniqueInput: {
        // input type
        id?: number | null // Int
    }
    TagCreateInput: {
        // input type
        name: string // String!
        test?: NexusGenInputs["TestCreateOneWithoutTestInput"] | null // TestCreateOneWithoutTestInput
        user: NexusGenInputs["UserCreateOneWithoutUserInput"] // UserCreateOneWithoutUserInput!
    }
    TagCreateManyWithoutTagsInput: {
        // input type
        connect?: NexusGenInputs["TagWhereUniqueInput"][] | null // [TagWhereUniqueInput!]
        create?: NexusGenInputs["TagCreateWithoutTestInput"][] | null // [TagCreateWithoutTestInput!]
    }
    TagCreateWithoutTestInput: {
        // input type
        name: string // String!
        user: NexusGenInputs["UserCreateOneWithoutUserInput"] // UserCreateOneWithoutUserInput!
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
        user: NexusGenInputs["UserCreateOneWithoutUserInput"] // UserCreateOneWithoutUserInput!
    }
    TestCreateManyWithoutTestsInput: {
        // input type
        connect?: NexusGenInputs["TestWhereUniqueInput"][] | null // [TestWhereUniqueInput!]
        create?: NexusGenInputs["TestCreateWithoutUserInput"][] | null // [TestCreateWithoutUserInput!]
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
        user: NexusGenInputs["UserCreateOneWithoutUserInput"] // UserCreateOneWithoutUserInput!
    }
    TestCreateWithoutUserInput: {
        // input type
        name: string // String!
        steps?: NexusGenInputs["StepCreateManyWithoutStepsInput"] | null // StepCreateManyWithoutStepsInput
        tags?: NexusGenInputs["TagCreateManyWithoutTagsInput"] | null // TagCreateManyWithoutTagsInput
    }
    TestWhereUniqueInput: {
        // input type
        id?: number | null // Int
    }
    UserCreateInput: {
        // input type
        email: string // String!
        firstName: string // String!
        lastName: string // String!
        password: string // String!
        selectors?:
            | NexusGenInputs["SelectorCreateManyWithoutSelectorsInput"]
            | null // SelectorCreateManyWithoutSelectorsInput
        steps?: NexusGenInputs["StepCreateManyWithoutStepsInput"] | null // StepCreateManyWithoutStepsInput
        tags?: NexusGenInputs["TagCreateManyWithoutTagsInput"] | null // TagCreateManyWithoutTagsInput
        tests?: NexusGenInputs["TestCreateManyWithoutTestsInput"] | null // TestCreateManyWithoutTestsInput
    }
    UserCreateOneWithoutUserInput: {
        // input type
        connect?: NexusGenInputs["UserWhereUniqueInput"] | null // UserWhereUniqueInput
        create?: NexusGenInputs["UserCreateWithoutTagsInput"] | null // UserCreateWithoutTagsInput
    }
    UserCreateWithoutTagsInput: {
        // input type
        email: string // String!
        firstName: string // String!
        lastName: string // String!
        password: string // String!
        selectors?:
            | NexusGenInputs["SelectorCreateManyWithoutSelectorsInput"]
            | null // SelectorCreateManyWithoutSelectorsInput
        steps?: NexusGenInputs["StepCreateManyWithoutStepsInput"] | null // StepCreateManyWithoutStepsInput
        tests?: NexusGenInputs["TestCreateManyWithoutTestsInput"] | null // TestCreateManyWithoutTestsInput
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
    SelectorCreateInput: NexusGenInputs["SelectorCreateInput"]
    SelectorCreateManyWithoutSelectorsInput: NexusGenInputs["SelectorCreateManyWithoutSelectorsInput"]
    SelectorCreateOneWithoutSelectorInput: NexusGenInputs["SelectorCreateOneWithoutSelectorInput"]
    SelectorCreateWithoutStepsInput: NexusGenInputs["SelectorCreateWithoutStepsInput"]
    SelectorCreateWithoutUserInput: NexusGenInputs["SelectorCreateWithoutUserInput"]
    SelectorWhereUniqueInput: NexusGenInputs["SelectorWhereUniqueInput"]
    StepCreateInput: NexusGenInputs["StepCreateInput"]
    StepCreateManyWithoutStepsInput: NexusGenInputs["StepCreateManyWithoutStepsInput"]
    StepCreateWithoutSelectorInput: NexusGenInputs["StepCreateWithoutSelectorInput"]
    StepWhereUniqueInput: NexusGenInputs["StepWhereUniqueInput"]
    TagCreateInput: NexusGenInputs["TagCreateInput"]
    TagCreateManyWithoutTagsInput: NexusGenInputs["TagCreateManyWithoutTagsInput"]
    TagCreateWithoutTestInput: NexusGenInputs["TagCreateWithoutTestInput"]
    TagWhereUniqueInput: NexusGenInputs["TagWhereUniqueInput"]
    TestCreateInput: NexusGenInputs["TestCreateInput"]
    TestCreateManyWithoutTestsInput: NexusGenInputs["TestCreateManyWithoutTestsInput"]
    TestCreateOneWithoutTestInput: NexusGenInputs["TestCreateOneWithoutTestInput"]
    TestCreateWithoutStepsInput: NexusGenInputs["TestCreateWithoutStepsInput"]
    TestCreateWithoutUserInput: NexusGenInputs["TestCreateWithoutUserInput"]
    TestWhereUniqueInput: NexusGenInputs["TestWhereUniqueInput"]
    UserCreateInput: NexusGenInputs["UserCreateInput"]
    UserCreateOneWithoutUserInput: NexusGenInputs["UserCreateOneWithoutUserInput"]
    UserCreateWithoutTagsInput: NexusGenInputs["UserCreateWithoutTagsInput"]
    UserWhereUniqueInput: NexusGenInputs["UserWhereUniqueInput"]
}

export interface NexusGenFieldTypes {
    Mutation: {
        // field return type
        createOneSelector: NexusGenRootTypes["Selector"] // Selector!
        createOneStep: NexusGenRootTypes["Step"] // Step!
        createOneTag: NexusGenRootTypes["Tag"] // Tag!
        createOneTest: NexusGenRootTypes["Test"] // Test!
        createOneUser: NexusGenRootTypes["User"] // User!
    }
    Query: {
        // field return type
        selector: NexusGenRootTypes["Selector"] | null // Selector
        step: NexusGenRootTypes["Step"] | null // Step
        tag: NexusGenRootTypes["Tag"] | null // Tag
        test: NexusGenRootTypes["Test"] | null // Test
        user: NexusGenRootTypes["User"] | null // User
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
        firstName: string // String!
        id: number // Int!
        lastName: string // String!
        password: string // String!
    }
}

export interface NexusGenArgTypes {
    Mutation: {
        createOneSelector: {
            // args
            data: NexusGenInputs["SelectorCreateInput"] // SelectorCreateInput!
        }
        createOneStep: {
            // args
            data: NexusGenInputs["StepCreateInput"] // StepCreateInput!
        }
        createOneTag: {
            // args
            data: NexusGenInputs["TagCreateInput"] // TagCreateInput!
        }
        createOneTest: {
            // args
            data: NexusGenInputs["TestCreateInput"] // TestCreateInput!
        }
        createOneUser: {
            // args
            data: NexusGenInputs["UserCreateInput"] // UserCreateInput!
        }
    }
    Query: {
        selector: {
            // args
            where: NexusGenInputs["SelectorWhereUniqueInput"] // SelectorWhereUniqueInput!
        }
        step: {
            // args
            where: NexusGenInputs["StepWhereUniqueInput"] // StepWhereUniqueInput!
        }
        tag: {
            // args
            where: NexusGenInputs["TagWhereUniqueInput"] // TagWhereUniqueInput!
        }
        test: {
            // args
            where: NexusGenInputs["TestWhereUniqueInput"] // TestWhereUniqueInput!
        }
        user: {
            // args
            where: NexusGenInputs["UserWhereUniqueInput"] // UserWhereUniqueInput!
        }
    }
    Test: {
        steps: {
            // args
            after?: string | null // String
            before?: string | null // String
            first?: number | null // Int
            last?: number | null // Int
            skip?: number | null // Int
        }
        tags: {
            // args
            after?: string | null // String
            before?: string | null // String
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
    | "SelectorCreateInput"
    | "SelectorCreateManyWithoutSelectorsInput"
    | "SelectorCreateOneWithoutSelectorInput"
    | "SelectorCreateWithoutStepsInput"
    | "SelectorCreateWithoutUserInput"
    | "SelectorWhereUniqueInput"
    | "StepCreateInput"
    | "StepCreateManyWithoutStepsInput"
    | "StepCreateWithoutSelectorInput"
    | "StepWhereUniqueInput"
    | "TagCreateInput"
    | "TagCreateManyWithoutTagsInput"
    | "TagCreateWithoutTestInput"
    | "TagWhereUniqueInput"
    | "TestCreateInput"
    | "TestCreateManyWithoutTestsInput"
    | "TestCreateOneWithoutTestInput"
    | "TestCreateWithoutStepsInput"
    | "TestCreateWithoutUserInput"
    | "TestWhereUniqueInput"
    | "UserCreateInput"
    | "UserCreateOneWithoutUserInput"
    | "UserCreateWithoutTagsInput"
    | "UserWhereUniqueInput"

export type NexusGenEnumNames = never

export type NexusGenInterfaceNames = never

export type NexusGenScalarNames = "Boolean" | "Float" | "ID" | "Int" | "String"

export type NexusGenUnionNames = never

export interface NexusGenTypes {
    context: {}
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
