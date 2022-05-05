import { ElementOf, Exact, Get, Narrow, transform } from "@re-/tools"
import { Root } from "./definitions/internal.js"
import { create, CheckReferences } from "./model.js"
import { compile, Space, SpaceConfig, ValidateDictionary } from "./space.js"

export const createDeclaredDefineFunctionMap = <
    DeclaredTypeNames extends string[]
>(
    typeNames: DeclaredTypeNames
) =>
    transform(typeNames, ([i, typeName]) => [
        typeName as string,
        createDeclaredDefineFunction(typeNames, typeName as any)
    ]) as DeclaredDefineFunctionMap<DeclaredTypeNames>

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
    (declaredTypeNames, definedTypeName) => (definition: any) => {
        // Dummy create for validation
        // @ts-ignore
        create(definition, {
            space: {
                dictionary: transform(declaredTypeNames, ([i, typeName]) => [
                    typeName,
                    "unknown"
                ])
            }
        })
        return { [definedTypeName]: definition } as any
    }

export type CheckDeclaredCompilation<
    Dict,
    DeclaredTypeNames extends string[],
    Checked = ValidateDictionary<Dict>,
    DeclaredTypeName extends string = ElementOf<DeclaredTypeNames>
> = {
    [TypeName in DeclaredTypeName]: Get<Checked, TypeName>
}

export type DeclaredCompileFunction<DeclaredTypeNames extends string[]> = <
    Dict,
    Config extends SpaceConfig<Dict>
>(
    dictionary: Exact<Dict, CheckDeclaredCompilation<Dict, DeclaredTypeNames>>,
    config?: Config
) => Space<Dict, Config>

export type DeclareFunction = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => {
    define: DeclaredDefineFunctionMap<DeclaredTypeNames>
    compile: DeclaredCompileFunction<DeclaredTypeNames>
}

export const declare: DeclareFunction = (...names) => ({
    // @ts-ignore
    define: createDeclaredDefineFunctionMap(names),
    // @ts-ignore
    compile: (dict, config) =>
        // @ts-ignore
        compile(dict, { ...config, delcaredTypeNames: names })
})

const declaration = declare("a", "b")

declaration.compile({
    a: "string",
    b: {
        a: "string[]|a"
    }
})
