import type { Evaluate, Get } from "@re-/tools"
import type { Root } from "../parser/root.js"
import type { Str } from "../parser/str/str.js"
import type {
    CheckResolutionForShallowCycle,
    IfShallowCycleErrorElse
} from "./shallowCyclic.js"

export namespace Space {
    export type Definition = {
        Aliases: unknown
        Meta: MetaDefinitions
    }

    export namespace Definition {
        export type Raw = {
            Aliases: unknown
            Meta: unknown
        }

        export type From<D extends Raw> = Evaluate<
            D & {
                Meta: MetaDefinitions
            }
        >
    }

    export type Resolved = Evaluate<
        Definition & {
            Resolutions: unknown
        }
    >

    export namespace Resolved {
        export type Raw = Definition.Raw & {
            Resolutions: unknown
        }

        export type From<S extends Raw> = S & { Meta: MetaDefinitions }
        export type Empty = From<{ Aliases: {}; Resolutions: {}; Meta: {} }>
    }

    export type MetaDefinitions = {
        onResolve?: unknown
    }

    export type Parse<S extends Definition> = Root.Parse<S["Aliases"], S>

    export type ValidateAliases<Aliases, Meta> = Evaluate<{
        [Alias in keyof Aliases]: ValidateAlias<
            Alias,
            Definition.From<{
                Aliases: Aliases
                Meta: Meta
            }>
        >
    }>

    export type ValidateAlias<
        Alias extends keyof S["Aliases"],
        S extends Definition
    > = Root.Validate<S["Aliases"][Alias], S>
    // S["Aliases"][Alias] extends string
    // ? ValidateStringResolution<Alias, S>
    // : Root.Validate<S["Aliases"][Alias], S>

    // TODO: Implement runtime equivalent for these
    export type ValidateMeta<Meta, Aliases> = {
        onResolve?: Root.Validate<
            Get<Meta, "onResolve">,
            Definition.From<{
                Aliases: Aliases & { $resolution: "unknown" }
                Meta: Meta
            }>
        >
    }

    type ValidateStringResolution<
        Alias extends keyof S["Aliases"],
        S extends Definition
    > = IfShallowCycleErrorElse<
        CheckResolutionForShallowCycle<S[Alias], S, [Extract<Alias, string>]>,
        Str.Validate<Extract<S[Alias], string>, S>
    >
}
