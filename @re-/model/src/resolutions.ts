import { ElementOf, IsAny, Iteration, Join, KeyValuate } from "@re-/tools"
import { Alias, Base, Root, Str } from "./nodes/index.js"
import { AliasIn } from "./space.js"

export type ShallowCycleError<Seen extends string[]> =
    Base.Parsing.ParseErrorMessage<`${Seen[0]} references a shallow cycle: ${Join<
        Seen,
        "=>"
    >}.`>

export const shallowCycleError = (shallowSeen: string[]) =>
    `${shallowSeen[0]} references a shallow cycle: ${shallowSeen.join("=>")}.`

/** When we detect a ShallowCycle, the generic will return a string tuple representing the cycle path.
 *  Otherwise, we return an empty tuple if no tuple is detected.
 *  This generic simply returns cycle path if it is not an empty tuple, otherwise it will return Else.
 */
type IfShallowCycleElse<
    CheckResult extends string[],
    Else
> = [] extends CheckResult ? Else : CheckResult

/**  For a list of string references, if any is in Seen, return Seen plus that reference,
 *   to represent the path at which the cycle occured. Otherwise, append the reference to seen and recurse.  */
type IterateReferencesForShallowCycle<
    References,
    Dict,
    Seen extends string[]
> = References extends Iteration<string, infer Current, infer Remaining>
    ? Current extends keyof Dict
        ? Current extends ElementOf<Seen>
            ? [...Seen, Current]
            : IfShallowCycleElse<
                  CheckResolutionForShallowCycleRecurse<
                      KeyValuate<Dict, Current>,
                      Dict,
                      [...Seen, Current]
                  >,
                  IterateReferencesForShallowCycle<Remaining, Dict, Seen>
              >
        : IterateReferencesForShallowCycle<Remaining, Dict, Seen>
    : []

/** For a given resolution, check it's shallow references to other aliases for cycles */
type CheckResolutionForShallowCycleRecurse<
    Resolution,
    Dict,
    Seen extends string[]
> = Resolution extends string
    ? IterateReferencesForShallowCycle<Str.References<Resolution>, Dict, Seen>
    : []

type CheckResolutionForShallowCycle<
    Resolution,
    Dict,
    Seen extends string[]
> = IsAny<Resolution> extends true
    ? []
    : CheckResolutionForShallowCycleRecurse<Resolution, Dict, Seen>

export type ParseResolution<Alias extends AliasIn<Dict>, Dict> = Root.Parse<
    Dict[Alias],
    Dict,
    { [K in Alias]: true }
>

type IfShallowCycleErrorElse<
    CheckResult extends string[],
    Else
> = [] extends CheckResult ? Else : ShallowCycleError<CheckResult>

export type ValidateResolution<
    Alias extends keyof Dict,
    Dict
> = Dict[Alias] extends string
    ? IfShallowCycleErrorElse<
          CheckResolutionForShallowCycle<
              Dict[Alias],
              Dict,
              [Extract<Alias, string>]
          >,
          Str.Validate<Dict[Alias], Dict, Dict[Alias]>
      >
    : Root.Validate<Dict[Alias], Dict>

type ReferenceMap = Record<string, string[]>

export const checkForShallowCycle = (
    resolutions: Record<string, Alias.Node>
) => {
    const directShallowReferences: ReferenceMap = {}
    for (const [alias, node] of Object.entries(resolutions)) {
        if (typeof node.resolution.def === "string") {
            const shallowAliasReferences = node.resolution.references({
                filter: (reference) => reference in resolutions
            })
            if (shallowAliasReferences.length) {
                directShallowReferences[alias] = shallowAliasReferences
            }
        }
    }
    checkRecursiveShallowReferences(directShallowReferences)
}

const checkRecursiveShallowReferences = (directReferenceMap: ReferenceMap) => {
    const checked: Record<string, boolean> = {}
    const checkShallowReferencePath = (alias: string, path: string[]) => {
        if (path.includes(alias)) {
            throw new Base.Parsing.ParseError(
                shallowCycleError([...path, alias])
            )
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
