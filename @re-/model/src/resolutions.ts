import { ElementOf, IsAny, Iteration, Join, KeyValuate } from "@re-/tools"
import { Common } from "./nodes/common.js"
import { Root, Str } from "./nodes/index.js"
import { SpaceDictionary } from "./space.js"

export type ShallowCycleError<
    Alias,
    Seen extends any[]
> = Common.Parser.ParseErrorMessage<`${Alias &
    string} references a shallow cycle: ${Join<Seen, "=>">}.`>

export const shallowCycleError = (def: string, shallowSeen: string[]) =>
    `${def} references a shallow cycle: ${[...shallowSeen, def].join("=>")}.`

type IterateReferencesForShallowCycle<
    References,
    Dict,
    Seen extends unknown[]
> = References extends Iteration<string, infer Current, infer Remaining>
    ? Current extends ElementOf<Seen>
        ? [...Seen, Current]
        : CheckReferenceForShallowCycleRecurse<
              KeyValuate<Dict, Current>,
              Dict,
              [...Seen, Current]
          > extends []
        ? IterateReferencesForShallowCycle<Remaining, Dict, Seen>
        : CheckReferenceForShallowCycleRecurse<
              KeyValuate<Dict, Current>,
              Dict,
              [...Seen, Current]
          >
    : []

type CheckReferenceForShallowCycleRecurse<
    Reference,
    Dict,
    Seen extends unknown[]
> = Reference extends string
    ? IterateReferencesForShallowCycle<Str.References<Reference>, Dict, Seen>
    : []

type CheckResolutionForShallowCycle<
    Resolution,
    Dict,
    Seen extends unknown[]
> = IsAny<Resolution> extends true
    ? []
    : CheckReferenceForShallowCycleRecurse<Resolution, Dict, Seen>

export type ParseResolution<Alias extends keyof Dict, Dict> = Root.Parse<
    Dict[Alias],
    Dict,
    { [K in Alias]: true }
>

export type ValidateResolution<
    Alias extends keyof Dict,
    Dict
> = Dict[Alias] extends string
    ? CheckResolutionForShallowCycle<Dict[Alias], Dict, [Alias]> extends []
        ? Root.Validate<Dict[Alias], Dict>
        : ShallowCycleError<
              Alias,
              CheckResolutionForShallowCycle<Dict[Alias], Dict, [Alias]>
          >
    : Root.Validate<Dict[Alias], Dict>

type ReferenceMap = Record<string, string[]>

export const checkForShallowCycle = (dictionary: SpaceDictionary) => {
    const directShallowReferences: ReferenceMap = {}
    for (const [alias, resolution] of Object.entries(dictionary)) {
        if (typeof resolution === "string") {
            const aliasReferences = Str.references(resolution).filter(
                (_) => _ in dictionary
            )
            if (aliasReferences.length) {
                directShallowReferences[alias] = aliasReferences
            }
        }
    }
    checkRecursiveShallowReferences(directShallowReferences)
}

const checkRecursiveShallowReferences = (directReferenceMap: ReferenceMap) => {
    const checked: Record<string, boolean> = {}
    const checkShallowReferencePath = (alias: string, path: string[]) => {
        if (path.includes(alias)) {
            throw new Common.Parser.ParseError(shallowCycleError(alias, path))
        }
        for (const shallowReference of directReferenceMap[alias]) {
            if (shallowReference in directReferenceMap) {
                checkShallowReferencePath(shallowReference, [...path, alias])
            }
        }
        checked[alias] = true
    }
    for (const alias of Object.keys(directReferenceMap)) {
        if (!checked[alias]) {
            checkShallowReferencePath(alias, [])
        }
    }
}
