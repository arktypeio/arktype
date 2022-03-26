import { ElementOf, Narrow, transform } from "@re-/tools"
import { create, CheckReferences } from "./create.js"
import { CompileFunction, createCompileFunction } from "./compile.js"

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
> = <Def>(
    definition: CheckReferences<Narrow<Def>, ElementOf<DeclaredTypeNames>>
) => {
    [K in DefinedTypeName]: Def
}

export const createDeclaredDefineFunction =
    <
        DefinedTypeName extends ElementOf<DeclaredTypeNames>,
        DeclaredTypeNames extends string[]
    >(
        declaredTypeNames: DeclaredTypeNames,
        definedTypeName: DefinedTypeName
    ): DeclaredDefineFunction<DefinedTypeName, DeclaredTypeNames> =>
    (definition: any) => {
        create(definition, {
            space: transform(declaredTypeNames, ([i, typeName]) => [
                typeName,
                "unknown"
            ]) as any
        })
        return { [definedTypeName]: definition } as any
    }

export type Declaration<DeclaredTypeNames extends string[] = string[]> = {
    define: DeclaredDefineFunctionMap<DeclaredTypeNames>
    compile: CompileFunction<DeclaredTypeNames>
}

export const declare = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => ({
    define: createDeclaredDefineFunctionMap(names),
    compile: createCompileFunction(names)
})
