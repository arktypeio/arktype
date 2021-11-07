import { ElementOf, Narrow, transform } from "@re-do/utils"
import { CompileFunction, createCompileFunction } from "./compile.js"
import { Validate } from "./definition.js"

export const createDefineFunctionMap = <DeclaredTypeNames extends string[]>(
    typeNames: DeclaredTypeNames
) =>
    transform(typeNames, ([index, typeName]) => [
        typeName as string,
        createDefineFunction(typeName as any)
    ]) as DefineFunctionMap<ElementOf<DeclaredTypeNames>>

export type DefineFunctionMap<DeclaredTypeName extends string> = {
    [DefinedTypeName in DeclaredTypeName]: DefineFunction<
        DefinedTypeName,
        DeclaredTypeName
    >
}

export type DefineFunction<
    DefinedTypeName extends DeclaredTypeName,
    DeclaredTypeName extends string
> = <Def>(definition: Validate<Narrow<Def>, DeclaredTypeName>) => {
    [K in DefinedTypeName]: Def
}

export const createDefineFunction =
    <DefinedTypeName extends DeclaredTypeName, DeclaredTypeName extends string>(
        definedTypeName: DefinedTypeName
    ): DefineFunction<DefinedTypeName, DeclaredTypeName> =>
    (definition: any) =>
        ({ [definedTypeName]: definition } as any)

export type Declaration<DeclaredTypeNames extends string[] = string[]> = {
    define: DefineFunctionMap<ElementOf<DeclaredTypeNames>>
    compile: CompileFunction<DeclaredTypeNames>
}

export const declare = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => ({
    define: createDefineFunctionMap(names),
    compile: createCompileFunction(names)
})
