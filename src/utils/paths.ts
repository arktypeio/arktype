import type { arraySubclassToReadonly } from "./generics.js"

export class Path extends Array<string> {
    static fromString(s: string, delimiter = "/") {
        return s === delimiter ? new Path() : new Path(...s.split(delimiter))
    }

    toString(delimiter = "/") {
        return this.length ? this.join(delimiter) : delimiter
    }
}

export type ReadonlyPath = arraySubclassToReadonly<Path>

export type pathToString<
    segments extends string[],
    delimiter extends string = "/"
> = segments extends [] ? "/" : join<segments, delimiter>

export type join<
    segments extends string[],
    delimiter extends string = "/",
    result extends string = ""
> = segments extends [infer head extends string, ...infer tail extends string[]]
    ? join<
          tail,
          delimiter,
          result extends "" ? head : `${result}${delimiter}${head}`
      >
    : result

export const getPath = (root: unknown, path: string[]): unknown => {
    let result: any = root
    for (const segment of path) {
        if (typeof result !== "object" || result === null) {
            return undefined
        }
        result = result[segment]
    }
    return result
}
