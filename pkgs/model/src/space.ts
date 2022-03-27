import {
    diffSets,
    ElementOf,
    Evaluate,
    KeyValuate,
    Narrow,
    transform,
    IsAny,
    Exact,
    Merge
} from "@re-/tools"
import {
    createCreateFunction,
    CreateFunction,
    TypeOf,
    Model,
    ModelOptions
} from "./model.js"
import { Map, Root } from "./definitions/index.js"
import {
    DefaultTypeOfContext,
    typeDefProxy,
    TypeOfContext
} from "./internal.js"
import { Resolution } from "./resolution.js"
import { DefaultParseTypeContext } from "./definitions/internal.js"

export type SpaceResolutions = Record<string, Root.Definition>

export type CheckSpaceResolutions<
    Space,
    SuperSpace = {}
> = IsAny<Space> extends true
    ? any
    : Evaluate<{
          [TypeName in keyof Space]: Resolution.Check<
              Space[TypeName],
              Merge<SuperSpace, Space>
          >
      }>

export type ParseSpaceRoot<Space, Context extends TypeOfContext> = {
    [TypeName in keyof Space]: TypeOf<
        Space[TypeName],
        CheckSpaceResolutions<Space>,
        Context
    >
}

export type ParseSpaceResolutions<Space, Context extends TypeOfContext> = {
    [TypeName in keyof Space]: Model<
        Space[TypeName],
        CheckSpaceResolutions<Space>,
        Context
    >
}

export const createCompileFunction =
    <DeclaredTypeNames extends string[]>(
        declaredTypeNames: Narrow<DeclaredTypeNames>
    ): CompileFunction<DeclaredTypeNames> =>
    (definitions) => {
        const declarationErrors = diffSets(
            declaredTypeNames,
            Object.keys(definitions)
        )
        if (declaredTypeNames.length && declarationErrors) {
            const errorParts = [] as string[]
            if (declarationErrors.added) {
                errorParts.push(
                    extraneousTypesErrorMessage.replace(
                        "@types",
                        declarationErrors.added.map((_) => `'${_}'`).join(", ")
                    )
                )
            }
            if (declarationErrors.removed) {
                errorParts.push(
                    missingTypesErrorMessage.replace(
                        "@types",
                        declarationErrors.removed
                            .map((_) => `'${_}'`)
                            .join(", ")
                    )
                )
            }
            throw new Error(errorParts.join(" "))
        }
        const create = createCreateFunction(definitions) as any
        return {
            models: transform(definitions, ([typeName, definition]) => [
                typeName,
                create(definition, {
                    space: definitions
                })
            ]),
            types: typeDefProxy,
            create
        } as any
    }

// Exported compile function is equivalent to compile from an empty declare call
// and will not validate missing or extraneous definitions
export const compile = createCompileFunction([])

export type CheckCompileDefinitions<
    Definitions,
    DeclaredTypeNames extends string[] = [],
    SuperSpace = {},
    Checked = CheckSpaceResolutions<Definitions, SuperSpace>,
    DefinedTypeName extends string = keyof Checked & string,
    DeclaredTypeName extends string = DeclaredTypeNames extends never[]
        ? DefinedTypeName
        : ElementOf<DeclaredTypeNames>
> = Evaluate<{
    [TypeName in DeclaredTypeName]: KeyValuate<Checked, TypeName>
}>

export const extraneousTypesErrorMessage = `Defined types @types were never declared.`
export const missingTypesErrorMessage = `Declared types @types were never defined.`

export type SpaceOptions<Definitions> = ModelOptions & {
    models?: {
        [Name in keyof Definitions]?: ModelOptions
    }
}

export type CompileFunction<DeclaredTypeNames extends string[]> = <
    Definitions,
    Options extends SpaceOptions<Definitions>
>(
    definitions: Narrow<
        Exact<
            Definitions,
            CheckCompileDefinitions<Definitions, DeclaredTypeNames>
        >
    >,
    options?: Options
) => Space<Definitions, Options>

type ExtendSpaceContext<ExtendedContext, NewContext> = Merge<
    ExtendedContext,
    NewContext
>

export type ExtendSpace<ExtendedDefinitions, ExtendedContext> = <
    Definitions,
    Options extends SpaceOptions<Definitions>
>(
    definitions: Narrow<
        Exact<
            Definitions,
            CheckCompileDefinitions<Definitions, [], ExtendedDefinitions>
        >
    >,
    options?: Options
) => Space<
    Merge<ExtendedDefinitions, Definitions>,
    ExtendSpaceContext<ExtendedContext, Options>
>

export type Space<Definitions, Context> = Evaluate<{
    models: ParseSpaceResolutions<Definitions, DefaultTypeOfContext>
    types: Evaluate<
        Map.TypeOf<
            Map.Parse<Definitions, Definitions, DefaultParseTypeContext>,
            Definitions,
            DefaultTypeOfContext
        >
    >
    create: CreateFunction<Definitions>
    extend: ExtendSpace<Definitions, Context>
    context: Context
    // TODO: Add declare extension
}>
