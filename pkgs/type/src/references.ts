import {
    ElementOf,
    Iteration,
    ListPossibleTypes,
    Split,
    WithDefaults
} from "@re-do/utils"
import { Root, Shallow } from "./components"

type ControlCharacters = ["|", "?", "(", ")", ",", "[", "]", "=", ">", " "]

type RawReferences<
    Fragments extends string,
    RemainingControlCharacters extends string[] = ControlCharacters
> = RemainingControlCharacters extends Iteration<
    string,
    infer Character,
    infer Remaining
>
    ? RawReferences<ElementOf<Split<Fragments, Character>>, Remaining>
    : Exclude<ElementOf<Split<Fragments, RemainingControlCharacters[0]>>, "">

type ShallowReferences<
    Def extends Shallow.Definition,
    Options extends ReferencesOptions,
    CompiledOptions extends Required<ReferencesOptions> = WithDefaults<
        ReferencesOptions,
        Options,
        { asList: false; filter: string }
    >,
    Result extends string = RawReferences<`${Def}`> & CompiledOptions["filter"]
> = CompiledOptions["asList"] extends true ? ListPossibleTypes<Result> : Result

export type ReferencesOptions = {
    asList?: boolean
    filter?: string
}

export type References<
    Def extends Root.Definition,
    Options extends ReferencesOptions = {}
> = Def extends Shallow.Definition
    ? ShallowReferences<Def, Options>
    : {
          [K in keyof Def]: References<Def[K], Options>
      }
