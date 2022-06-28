import {
    diffSets,
    DiffSetsResult,
    ElementOf,
    Exact,
    Get,
    Narrow,
    transform
} from "@re-/tools"
import { space, SpaceFrom, SpaceOptions, ValidateDictionary } from "./space.js"
import { Root } from "./index.js"

export const declare: DeclareFn = (...names) => ({
    define: createDeclaredDefineFunctionMap(names) as any,
    compile: (dict, options) => {
        const discrepancies = diffSets(names, Object.keys(dict))
        if (discrepancies) {
            throw new DeclarationError(discrepancies)
        }
        return space(dict as any, options)
    }
})

export type DeclareFn = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => {
    define: DeclaredDefineFunctionMap<DeclaredTypeNames>
    compile: DeclaredCompileFunction<DeclaredTypeNames>
}

const createDeclaredDefineFunctionMap = <DeclaredTypeNames extends string[]>(
    typeNames: DeclaredTypeNames
): DeclaredDefineFunctionMap<DeclaredTypeNames> =>
    transform(typeNames, ([, typeName]) => [
        typeName as string,
        createDeclaredDefineFunction(typeNames, typeName)
    ])

type DeclaredDefineFunctionMap<DeclaredTypeNames extends string[]> = {
    [DefinedTypeName in ElementOf<DeclaredTypeNames>]: DeclaredDefineFunction<
        DefinedTypeName,
        DeclaredTypeNames
    >
}

type DeclaredDefineFunction<
    DefinedTypeName extends ElementOf<DeclaredTypeNames>,
    DeclaredTypeNames extends string[]
> = <Def>(definition: CheckReferences<Def, ElementOf<DeclaredTypeNames>>) => {
    [K in DefinedTypeName]: Def
}

type CreateDeclaredDefineFunction = <
    DefinedTypeName extends ElementOf<DeclaredTypeNames>,
    DeclaredTypeNames extends string[]
>(
    declaredTypeNames: DeclaredTypeNames,
    definedTypeName: DefinedTypeName
) => DeclaredDefineFunction<DefinedTypeName, DeclaredTypeNames>

const createDeclaredDefineFunction: CreateDeclaredDefineFunction =
    (declaredTypeNames, definedTypeName) => (definition) => {
        // Dummy create for validation
        space(
            Object.fromEntries(
                declaredTypeNames.map((typeName) => [typeName, "unknown"])
            ) as any
        ).create(definition as any)
        return { [definedTypeName]: definition } as any
    }

/*
 * Just use unknown for now since we don't have all the definitions yet
 * but we still want to allow references to other declared types
 */
type CheckReferences<Def, DeclaredTypeName extends string> = Root.Validate<
    Def,
    {
        [TypeName in DeclaredTypeName]: "unknown"
    }
>

type CheckDeclaredCompilation<Dict, DeclaredTypeNames extends string[]> = {
    [TypeName in ElementOf<DeclaredTypeNames>]: Get<
        ValidateDictionary<Dict>,
        TypeName
    >
}

export type DeclaredCompileFunction<DeclaredTypeNames extends string[]> = <
    Dict
>(
    dictionary: Exact<Dict, CheckDeclaredCompilation<Dict, DeclaredTypeNames>>,
    config?: SpaceOptions<keyof Dict & string>
) => SpaceFrom<Dict>

export class DeclarationError extends Error {
    constructor(discrepancies: NonNullable<DiffSetsResult>) {
        const errorParts = [] as string[]
        if (discrepancies.added) {
            errorParts.push(
                `Defined types ${discrepancies.added
                    .map((_) => `'${_}'`)
                    .join(", ")} were never declared.`
            )
        }
        if (discrepancies.removed) {
            errorParts.push(
                `Declared types ${discrepancies.removed
                    .map((_) => `'${_}'`)
                    .join(", ")} were never defined.`
            )
        }
        super(errorParts.join(" "))
    }
}
