import type { List } from "./generics"

export type PathString<delimiter extends string = "/"> =
    | delimiter
    | `${string}${delimiter}${string}`

export class Path<delimiter extends string = "/"> extends Array<string> {
    delimiter = "/" as delimiter

    static from<
        s extends PathString<delimiter>,
        delimiter extends string = "/"
    >(s: s, delimiter?: delimiter) {
        const result: Path<delimiter> =
            s === delimiter
                ? new Path()
                : new Path(...s.split(delimiter ?? "/"))
        if (delimiter) {
            result.delimiter = delimiter
        }
        return result
    }

    toString() {
        return (
            this.length ? this.join(this.delimiter) : this.delimiter
        ) as PathString
    }

    get descriptionPrefix() {
        return this.length ? `At ${this.toString()}: ` : ""
    }
}

export type pathToString<
    segments extends List<string>,
    delimiter extends string = "/",
    result extends string = ""
> = segments extends [infer head extends string, ...infer tail extends string[]]
    ? pathToString<
          tail,
          result extends "" ? head : `${result}${delimiter}${head}`
      >
    : result extends ""
    ? "/"
    : result

export type pathDescriptionPrefix<
    path extends List<string>,
    delimiter extends string = "/"
> = path extends [] ? "" : `At ${pathToString<path, delimiter>}: `

export const getPath = (value: unknown, path: string[]): unknown => {
    let result: any = value
    for (const segment of path) {
        if (typeof result !== "object" || result === null) {
            return undefined
        }
        result = result[segment]
    }
    return result
}
