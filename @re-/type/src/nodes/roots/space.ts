import { chainableNoOpProxy, mapValues } from "@re-/tools"
import type { Dictionary } from "@re-/tools"
import { Root } from "../../parser/root.js"
import { Scope } from "../expression/scope.js"
import type { ArktypeOptions } from "./type.js"
import { ArktypeRoot } from "./type.js"

// TODO: Ensure there are no extraneous types/space calls from testing
// TODO: Ensure "Dict"/"dictionary" etc. is not used anywhere referencing space
// TODO: Is proxy better?
export class ArktypeSpace {
    constructor(
        public resolutions: Dictionary<ArktypeRoot>,
        public context: ArktypeOptions
    ) {}

    type(def: unknown, typeContext: ArktypeOptions) {
        const root = Root.parse(def, { aliases: this.resolutions })
        return new ArktypeRoot(
            root,
            Scope.merge(this.context, typeContext),
            this.resolutions
        ) as any
    }

    get infer() {
        return chainableNoOpProxy
    }

    get ast() {
        return mapValues(this.resolutions, (resolution) => resolution.ast)
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
