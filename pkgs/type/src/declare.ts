import { ElementOf, Narrow, transform } from "@re-do/utils"
import { parse } from "./parse.js"
import { CompileFunction, createCompileFunction } from "./compile.js"
import { TypeSet } from "./components"

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
    definition: TypeSet.ValidateReferences<
        Narrow<Def>,
        ElementOf<DeclaredTypeNames>
    >
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
        parse(definition, {
            typeSet: transform(declaredTypeNames, ([i, typeName]) => [
                typeName,
                "unknown"
            ]) as any
        })
        return { [definedTypeName]: definition } as any
    }

export type Declaration<DeclaredTypeNames extends string[] = string[]> = {
    define: DefineFunctionMap<DeclaredTypeNames>
    compile: CompileFunction<DeclaredTypeNames>
}

export const declare = <DeclaredTypeNames extends string[]>(
    ...names: Narrow<DeclaredTypeNames>
) => ({
    define: createDefineFunctionMap(names),
    compile: createCompileFunction(names)
})
