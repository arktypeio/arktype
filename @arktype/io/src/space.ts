import type { Dictionary, Evaluate } from "@arktype/tools"
import { chainableNoOpProxy } from "@arktype/tools"
import type { LazyDynamicWrap } from "./internal.js"
import { lazyDynamicWrap } from "./internal.js"
import type { inferAst } from "./nodes/ast/infer.js"
import type { validate } from "./nodes/ast/validate.js"
import { Scope } from "./nodes/expression/infix/scope.js"
import { Root } from "./parser/root.js"
import type { ParseSpace } from "./parser/space.js"
import type { ArktypeOptions, InferredTypeFn } from "./type.js"
import { Arktype } from "./type.js"

const rawSpace = (aliases: Dictionary, opts: ArktypeOptions = {}) => {
    const ctx = opts as SpaceContext
    ctx.resolutions = {}
    for (const name in aliases) {
        ctx.resolutions[name] = new Arktype(
            Root.parse(aliases[name], { aliases })
        )
    }
    ctx.resolutions.$ = new ArktypeSpace(ctx) as any
    return ctx.resolutions as any as DynamicSpace
}

export const space = lazyDynamicWrap(rawSpace) as SpaceFn

type InferredSpaceFn = <Aliases, Resolutions = ParseSpace<Aliases>>(
    aliases: validate<Aliases, Resolutions, Resolutions>,
    options?: ArktypeOptions
) => SpaceOutput<{ aliases: Aliases; resolutions: Resolutions }>

type DynamicSpaceFn = <Aliases extends Dictionary>(
    aliases: Aliases,
    options?: ArktypeOptions
) => DynamicSpace<Aliases>

export type SpaceFn = LazyDynamicWrap<InferredSpaceFn, DynamicSpaceFn>

export type DynamicSpace<Aliases extends Dictionary = Dictionary> = Record<
    keyof Aliases,
    Arktype
> & {
    $: DynamicSpaceRoot
}

export type DynamicSpaceRoot = SpaceRootFrom<{
    aliases: Dictionary
    resolutions: Dictionary
}>

export type ResolvedSpace = {
    aliases: unknown
    resolutions: unknown
}

export namespace ResolvedSpace {
    export type From<S extends ResolvedSpace> = S

    export type Empty = From<{ aliases: {}; resolutions: {} }>
}

export type SpaceOutput<Space extends ResolvedSpace> = SpaceTypeRoots<
    Space["resolutions"]
> & {
    $: SpaceRootFrom<Space>
}

export type SpaceRootFrom<Space extends ResolvedSpace> = {
    infer: InferSpaceRoot<Space["resolutions"]>
    type: InferredTypeFn<Space>
}

export type SpaceTypeRoots<Resolutions> = Evaluate<{
    [Name in keyof Resolutions]: Arktype<
        inferAst<Resolutions[Name], Resolutions>,
        Resolutions[Name]
    >
}>

export type InferSpaceRoot<Resolutions> = Evaluate<{
    [Name in keyof Resolutions]: inferAst<Resolutions[Name], Resolutions>
}>

type SpaceContext = ArktypeOptions & { resolutions: Dictionary<Arktype> }

// TODO: Ensure there are no extraneous types/space calls from testing
// TODO: Ensure "Dict"/"dictionary" etc. is not used anywhere referencing space
export class ArktypeSpace {
    constructor(private context: SpaceContext) {}

    type(def: unknown, typeContext: ArktypeOptions = {}) {
        const root = Root.parse(def, { aliases: this.context.resolutions })
        return new Scope(root, (this.context, typeContext))
    }

    get infer() {
        return chainableNoOpProxy
    }
}

// export type ExtendFn<S> = <ExtensionDefinitions, ExtensionRoot>(
//     dictionary: ValidateDictionaryExtension<S, ExtensionDefinitions>,
//     options?: ValidateSpaceOptions<
//         Merge<Space.DefinitionsOf<S>, ExtensionDefinitions>,
//         ExtensionRoot
//     >
// ) => ToSpaceOutput<
//     Merge<S, ExtensionDefinitions> & {
//         $root: Merge<Space.RootOf<S>, ExtensionRoot>
//     }
// >

// export type ExtendSpaceFn<S extends Space.Definition> = <Aliases, Meta = {}>(
//     dictionary: Space.ValidateAliases<Aliases, Meta>,
//     options?: Conform<Meta, Space.ValidateMeta<Meta, Aliases>>
// ) => ToSpaceOutput<Aliases>

// export type ValidateDictionaryExtension<BaseDict, ExtensionDict> = {
//     [Alias in keyof ExtensionDict]: Root.Validate<
//         ExtensionDict[Alias],
//         Merge<BaseDict, ExtensionDict>
//     >
// }

// export type ReferencesOptions<Filter extends string = string> = {
//     filter?: FilterFn<Filter>
// }

// export type FilterFn<Filter extends string> =
//     | ((reference: string) => reference is Filter)
//     | ((reference: string) => boolean)

// export type ReferencesFn<Ast> = <Options extends ReferencesOptions = {}>(
//     options?: Options
// ) => ElementOf<
//     ReferencesOf<
//         Ast,
//         Options["filter"] extends FilterFn<infer Filter> ? Filter : string
//     >
// >[]

// collectReferences(
//     args: References.ReferencesOptions,
//     collected: KeySet
// ) {
//     if (!args.filter || args.filter(this.def)) {
//         collected[this.def] = 1
//     }
// }
