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
    FilterType = any,
    ExcludeType = never,
    Delimiter extends string = "/",
    Depth extends number = 5,
    Start extends string = ""
> = [Depth] extends [never]
    ? never
    : T extends object
    ? {
          [K in keyof T]-?: K extends Segment
              ? Leaves<
                    T[K],
                    FilterType,
                    ExcludeType,
                    Delimiter,
                    Prev[Depth],
                    Start extends "" ? K : Join<Start, K, Delimiter>
                >
              : never
      }[keyof T]
    : T extends FilterType
    ? T extends ExcludeType
        ? never
        : Start
    : never

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

export type Paths<
    T,
    FilterType = any,
    ExcludeType = never,
    Delimiter extends string = "/",
    Depth extends number = 5,
    Start extends string = ""
> = PathsFromLeaves<
    Leaves<T, FilterType, ExcludeType, Delimiter, Depth, Start>,
    Delimiter
>
