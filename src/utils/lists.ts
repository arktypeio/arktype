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

export type split<
    s extends string,
    delimiter extends string,
    result extends string[] = []
> = s extends `${infer head}${delimiter}${infer tail}`
    ? split<tail, delimiter, [...result, head]>
    : [...result, s]

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

export const intersectUniqueLists = <item>(
    l: readonly item[],
    r: readonly item[]
) => {
    const intersection = [...l]
    for (const item of r) {
        if (!l.includes(item)) {
            intersection.push(item)
        }
    }
    return intersection
}

export type List<t = unknown> = readonly t[]

export type listable<t> = t | readonly t[]

export type arraySubclassToReadonly<t extends unknown[]> =
    readonly t[number][] & {
        [k in Exclude<keyof t, keyof unknown[]>]: t[k]
    }

export const listFrom = <t>(data: t) =>
    (Array.isArray(data) ? data : [data]) as t extends unknown[] ? t : t[]
