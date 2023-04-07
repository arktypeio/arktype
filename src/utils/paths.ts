import type { arraySubclassToReadonly } from "./generics.js"

export class Path extends Array<string | number> {
    static fromString(s: string, delimiter = "/") {
        return s === delimiter ? new Path() : new Path(...s.split(delimiter))
    }

    toString(delimiter = "/") {
        return this.length ? this.join(delimiter) : delimiter
    }

    get json() {
        return JSON.stringify(this)
    }

    toPropChain(result = "data") {
        for (const segment of this) {
            if (typeof segment === "string") {
                if (/^[a-zA-Z_$][a-zA-Z_$0-9]*$/.test(segment)) {
                    result += `.${segment}`
                } else {
                    result += `[${
                        /^\$\{.*\}$/.test(segment)
                            ? segment.slice(2, -1)
                            : JSON.stringify(segment)
                    }]`
                }
            } else {
                result += `[${segment}]`
            }
        }
        return result
    }
}

export type ReadonlyPath = arraySubclassToReadonly<Path>

export type Segments = (string | number)[]

export type pathToString<
    segments extends Segments,
    delimiter extends string = "/"
> = segments extends [] ? "/" : join<segments, delimiter>

export type join<
    segments extends Segments,
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
