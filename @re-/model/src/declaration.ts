import {
    diffSets,
    ElementOf,
    Exact,
    Get,
    Narrow,
    SetChange,
    transform
} from "@re-/tools"
import { Validate } from "./model.js"
import {
    SpaceFrom,
    SpaceOptions,
    spaceRaw,
    ValidateDictionary
} from "./space.js"

export const declare: DeclareFn = (...names) => ({
    define: createDeclaredDefineFunctionMap(names) as any,
    compile: (dict, options) => {
        const discrepancies = diffSets(names, Object.keys(dict))
        if (discrepancies) {
            throw new DeclarationError(discrepancies)
        }
        return spaceRaw(dict, options) as any
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
        createDeclaredDefineFunction(typeNames, typeName as any)
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
        spaceRaw(
            Object.fromEntries(
                declaredTypeNames.map((typeName) => [typeName, "unknown"])
            )
        ).$meta.model(definition)
        return { [definedTypeName]: definition } as any
    }

/*
 * Just use unknown for now since we don't have all the definitions yet
 * but we still want to allow references to other declared types
 */
type CheckReferences<Def, DeclaredTypeName extends string> = Validate<
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
    options?: SpaceOptions<keyof Dict & string>
) => SpaceFrom<Dict>

export class DeclarationError extends Error {
    constructor(discrepancies: NonNullable<SetChange<string>>) {
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
