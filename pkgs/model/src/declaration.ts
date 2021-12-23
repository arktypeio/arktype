import { ElementOf, Narrow, transform } from "@re-/tools"
import { define, CheckReferences } from "./model.js"
import { TypespaceFunction, createTypespaceFunction } from "./typespace.js"

export const createDefineFunctionMap = <DeclaredTypeNames extends string[]>(
    typeNames: DeclaredTypeNames
) =>
    transform(typeNames, ([i, typeName]) => [
        typeName as string,
        createDefineFunction(typeNames, typeName as any)
    ]) as DefineFunctionMap<DeclaredTypeNames>

export type DefineFunctionMap<DeclaredTypeNames extends string[]> = {
    [DefinedTypeName in ElementOf<DeclaredTypeNames>]: DefineFunction<
        DefinedTypeName,
        DeclaredTypeNames
    >
}

export type DefineFunction<
    DefinedTypeName extends ElementOf<DeclaredTypeNames>,
    DeclaredTypeNames extends string[]
> = <Def>(
    definition: CheckReferences<Narrow<Def>, ElementOf<DeclaredTypeNames>>
) => {
    [K in DefinedTypeName]: Def
}

export const createDefineFunction =
    <
        DefinedTypeName extends ElementOf<DeclaredTypeNames>,
        DeclaredTypeNames extends string[]
    >(
        declaredTypeNames: DeclaredTypeNames,
        definedTypeName: DefinedTypeName
    ): DefineFunction<DefinedTypeName, DeclaredTypeNames> =>
    (definition: any) => {
        definition(definition, {
            typespace: transform(declaredTypeNames, ([i, typeName]) => [
                typeName,
                "unknown"
            ]) as any
        })
        return { [definedTypeName]: definition } as any
    }

export type Declaration<DeclaredTypeNames extends string[] = string[]> = {
    define: DefineFunctionMap<DeclaredTypeNames>
    compile: TypespaceFunction<DeclaredTypeNames>
}

export const declaration = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => ({
    define: createDefineFunctionMap(names),
    compile: createTypespaceFunction(names)
})
