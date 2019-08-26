import { readdirSync, lstatSync } from "fs-extra"
import { join } from "path"

export const walk = (dir: string): [string, any][] =>
    readdirSync(dir).map(item => [
        item,
        lstatSync(join(dir, item)).isDirectory() ? walk(join(dir, item)) : null
    ])

export const walkPaths = (dir: string): string[] =>
    readdirSync(dir).reduce(
        (paths, item) => {
            const path = join(dir, item)
            return [
                ...paths,
                ...(lstatSync(path).isDirectory() ? walkPaths(path) : [path])
            ]
        },
        [] as string[]
    )
