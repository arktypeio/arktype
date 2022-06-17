import {
    diffSets,
    DiffSetsResult,
    ElementOf,
    Exact,
    Narrow,
    transform
} from "@re-/tools"
import { CheckReferences, model } from "./model.js"
import {
    compile,
    SpaceFrom,
    SpaceOptions,
    ValidateDictionary
} from "./space.js"

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
        // @ts-ignore
        model(definition, {
            space: {
                dictionary: transform(declaredTypeNames, ([, typeName]) => [
                    typeName,
                    "unknown"
                ])
            }
        })
        return { [definedTypeName]: definition } as any
    }

type CheckDeclaredCompilation<Dict, DeclaredTypeNames extends string[]> = {
    // @ts-ignore
    [TypeName in ElementOf<DeclaredTypeNames>]: ValidateDictionary<Dict>[TypeName]
}

type DeclaredCompileFunction<DeclaredTypeNames extends string[]> = <Dict>(
    dictionary: Exact<Dict, CheckDeclaredCompilation<Dict, DeclaredTypeNames>>,
    config?: SpaceOptions<keyof Dict & string>
) => SpaceFrom<Dict>

type DeclareFunction = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => {
    define: DeclaredDefineFunctionMap<DeclaredTypeNames>
    compile: DeclaredCompileFunction<DeclaredTypeNames>
}

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

export const declare: DeclareFunction = (...names) => ({
    // @ts-ignore
    define: createDeclaredDefineFunctionMap(names),
    compile: (dict, options) => {
        const discrepancies = diffSets(names, Object.keys(dict))
        if (discrepancies) {
            throw new DeclarationError(discrepancies)
        }
        // @ts-ignore
        return compile(dict, options)
    }
})
