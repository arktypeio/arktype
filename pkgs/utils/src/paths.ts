import { NonObject, NonRecursible, Unlisted } from "common.js"
import { Object, String, List } from "ts-toolbelt"
import { AutoPath } from "./AutoPath.js"

export type ValueAtPath<
    O extends object,
    P extends string,
    Delimiter extends string = "/"
> = Object.Path<O, String.Split<P, Delimiter>>

export function valueAtPath<O extends object, P extends string>(
    obj: O,
    path: AutoPath<O, P, "/">
): ValueAtPath<O, P> {
    const segments = path.split("/")
    let value = obj
    for (let segment of segments) {
        if (typeof value === "object" && segment in value) {
            value = (value as any)[segment]
        } else {
            // This should never happen if the provided types are accurate
            return undefined as any
        }
    }
    return value as any
}

type Prev = [
    never,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    ...0[]
]

type Join<K, P, Delimiter extends string = "/"> = K extends string | number
    ? P extends string | number
        ? `${K}${"" extends P ? "" : Delimiter}${P}`
        : never
    : never

export type Segment = string | number

export type Leaves<
    T,
    LeafConstraints extends Constraints<Filter, Exclude, TreatAsLeaf> = {},
    Delimiter extends string = "/",
    Depth extends number = 10,
    Start extends string = "",
    Filter = LeafConstraints extends { filter: infer F } ? F : any,
    Exclude = LeafConstraints extends { exclude: infer X } ? X : never,
    TreatAsLeaf = LeafConstraints extends { treatAsLeaf: infer L }
        ? L
        : NonRecursible,
    InArray = false
> = [Depth] extends [never]
    ? never
    : T extends TreatAsLeaf | NonRecursible
    ? InArray extends true
        ? never
        : T extends Filter
        ? T extends Exclude
            ? never
            : Start
        : never
    : T extends any[]
    ? Leaves<
          Unlisted<T>,
          LeafConstraints,
          Delimiter,
          Depth,
          Start,
          Filter,
          Exclude,
          TreatAsLeaf,
          true
      >
    : {
          [K in keyof T]-?: K extends Segment
              ? Leaves<
                    T[K],
                    LeafConstraints,
                    Delimiter,
                    Prev[Depth],
                    Start extends "" ? K : Join<Start, K, Delimiter>,
                    Filter,
                    Exclude,
                    TreatAsLeaf
                >
              : never
      }[keyof T]

type PathsFromLeaves<
    Leaves extends string,
    Delimiter extends string = "/"
> = Leaves extends ""
    ? never
    :
          | Leaves
          | PathsFromLeaves<
                String.Join<
                    List.Pop<String.Split<Leaves, Delimiter>>,
                    Delimiter
                >,
                Delimiter
            >

export type Constraints<Filter, Exclude, TreatAsLeaf> = {
    filter?: Filter
    exclude?: Exclude
    treatAsLeaf?: TreatAsLeaf
}

export type Paths<
    T,
    LeafConstraints extends Constraints<Filter, Exclude, TreatAsLeaf> = {},
    Delimiter extends string = "/",
    Depth extends number = 10,
    Start extends string = "",
    Filter = LeafConstraints extends { filter: infer F } ? F : any,
    Exclude = LeafConstraints extends { exclude: infer X } ? X : never,
    TreatAsLeaf = LeafConstraints extends { treatAsLeaf: infer L }
        ? L
        : NonRecursible
> = PathsFromLeaves<
    Leaves<
        T,
        LeafConstraints,
        Delimiter,
        Depth,
        Start,
        Filter,
        Exclude,
        TreatAsLeaf
    >,
    Delimiter
>
