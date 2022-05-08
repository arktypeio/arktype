import { ElementOf, Exact, Narrow, transform } from "@re-/tools"
import { model, CheckReferences } from "./model.js"
import { compile, Space, SpaceOptions, ValidateDictionary } from "./space.js"

export const createDeclaredDefineFunctionMap = <
    DeclaredTypeNames extends string[]
>(
    typeNames: DeclaredTypeNames
): DeclaredDefineFunctionMap<DeclaredTypeNames> =>
    transform(typeNames, ([, typeName]) => [
        typeName as string,
        createDeclaredDefineFunction(typeNames, typeName)
    ])

export type DeclaredDefineFunctionMap<DeclaredTypeNames extends string[]> = {
    [DefinedTypeName in ElementOf<DeclaredTypeNames>]: DeclaredDefineFunction<
        DefinedTypeName,
        DeclaredTypeNames
    >
}

export type DeclaredDefineFunction<
    DefinedTypeName extends ElementOf<DeclaredTypeNames>,
    DeclaredTypeNames extends string[]
> = <Def>(definition: CheckReferences<Def, ElementOf<DeclaredTypeNames>>) => {
    [K in DefinedTypeName]: Def
}

export type CreateDeclaredDefineFunction = <
    DefinedTypeName extends ElementOf<DeclaredTypeNames>,
    DeclaredTypeNames extends string[]
>(
    declaredTypeNames: DeclaredTypeNames,
    definedTypeName: DefinedTypeName
) => DeclaredDefineFunction<DefinedTypeName, DeclaredTypeNames>

export const createDeclaredDefineFunction: CreateDeclaredDefineFunction =
    (declaredTypeNames, definedTypeName) => (definition) => {
        // Dummy create for validation
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

export type CheckDeclaredCompilation<
    Dict,
    DeclaredTypeNames extends string[]
> = {
    // @ts-ignore
    [TypeName in ElementOf<DeclaredTypeNames>]: ValidateDictionary<Dict>[TypeName]
}

export type DeclaredCompileFunction<DeclaredTypeNames extends string[]> = <
    Dict
>(
    dictionary: Exact<Dict, CheckDeclaredCompilation<Dict, DeclaredTypeNames>>,
    config?: SpaceOptions<keyof Dict & string>
) => Space<Dict>

export type DeclareFunction = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => {
    define: DeclaredDefineFunctionMap<DeclaredTypeNames>
    compile: DeclaredCompileFunction<DeclaredTypeNames>
}

export const declare: DeclareFunction = (...names) => ({
    // @ts-ignore
    define: createDeclaredDefineFunctionMap(names),
    compile: (dict, config) =>
        // @ts-ignore
        compile(dict, { ...config, declaredTypeNames: names })
})

const declaration = declare("a", "b")

declaration.compile({
    a: "string",
    b: {
        a: "string[]|a"
    }
})
