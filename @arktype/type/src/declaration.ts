// import type { ElementOf, Exact, Get, Narrow, SetChange } from "@arktype/tools"
// import { diffSets } from "@arktype/tools"
// import type {
//     SpaceOutput,
//     ValidateResolutions,
//     ValidateSpaceOptions
// } from "./space.js"
// import { dynamicSpace } from "./space.js"

export const declare = (...names: any[]) => names as any

// export const declare: DeclareFn = (...names) => ({
//     define: createDeclaredDefineFnMap(names) as any,
//     compile: (dict, options) => {
//         const discrepancies = diffSets(names, Object.keys(dict))
//         if (discrepancies) {
//             throw new DeclaredCompilationError(discrepancies)
//         }
//         return dynamicSpace(dict, options) as any
//     }
// })

// export type DeclareFn = <DeclaredTypeNames extends string[]>(
//     ...names: Narrow<DeclaredTypeNames>
// ) => {
//     define: DeclaredDefineFnMap<DeclaredTypeNames>
//     compile: DeclaredCompileFn<DeclaredTypeNames>
// }

// const createDeclaredDefineFnMap = <DeclaredTypeNames extends string[]>(
//     typeNames: DeclaredTypeNames
// ): DeclaredDefineFnMap<DeclaredTypeNames> =>
//     Object.fromEntries(
//         typeNames.map((typeName) => [
//             typeName,
//             createDeclaredDefineFn(typeNames, typeName as any)
//         ])
//     ) as any

// type DeclaredDefineFnMap<DeclaredTypeNames extends string[]> = {
//     [DefinedTypeName in ElementOf<DeclaredTypeNames>]: DeclaredDefineFn<
//         DefinedTypeName,
//         DeclaredTypeNames
//     >
// }

// type DeclaredDefineFn<
//     DefinedTypeName extends ElementOf<DeclaredTypeNames>,
//     DeclaredTypeNames extends string[]
// > = <Def>(definition: CheckReferences<Def, ElementOf<DeclaredTypeNames>>) => {
//     [K in DefinedTypeName]: Def
// }

// type CreateDeclaredDefineFn = <
//     DefinedTypeName extends ElementOf<DeclaredTypeNames>,
//     DeclaredTypeNames extends string[]
// >(
//     declaredTypeNames: DeclaredTypeNames,
//     definedTypeName: DefinedTypeName
// ) => DeclaredDefineFn<DefinedTypeName, DeclaredTypeNames>

// const createDeclaredDefineFn: CreateDeclaredDefineFn =
//     (declaredTypeNames, definedTypeName) => (definition) => {
//         // Dummy create for validation
//         dynamicSpace(
//             Object.fromEntries(
//                 declaredTypeNames.map((typeName) => [typeName, "unknown"])
//             )
//         ).$.type(definition)
//         return { [definedTypeName]: definition } as any
//     }

// /*
//  * Just use unknown for now since we don't have all the definitions yet
//  * but we still want to allow references to other declared types
//  */
// type CheckReferences<Def, DeclaredTypeName extends string> = Validate<
//     Def,
//     {
//         [TypeName in DeclaredTypeName]: "unknown"
//     }
// >

// type CheckDeclaredCompilation<Dict, DeclaredTypeNames extends string[]> = {
//     [TypeName in ElementOf<DeclaredTypeNames>]: Get<
//         ValidateResolutions<Dict>,
//         TypeName
//     >
// }

// export type DeclaredCompileFn<DeclaredTypeNames extends string[]> = <
//     Dict,
//     Meta = {}
// >(
//     dictionary: Exact<Dict, CheckDeclaredCompilation<Dict, DeclaredTypeNames>>,
//     options?: ValidateSpaceOptions<Dict, Meta>
//     // @ts-expect-error Constraining Meta interferes with our ability to validate it
// ) => SpaceOutput<{ Dict: Dict; Meta: Meta }>

// export class DeclaredCompilationError extends Error {
//     constructor(discrepancies: NonNullable<SetChange<string>>) {
//         const errorParts = [] as string[]
//         if (discrepancies.added) {
//             errorParts.push(
//                 `Defined types ${discrepancies.added
//                     .map((_) => `'${_}'`)
//                     .join(", ")} were never declared.`
//             )
//         }
//         if (discrepancies.removed) {
//             errorParts.push(
//                 `Declared types ${discrepancies.removed
//                     .map((_) => `'${_}'`)
//                     .join(", ")} were never defined.`
//             )
//         }
//         super(errorParts.join(" "))
//     }
// }
