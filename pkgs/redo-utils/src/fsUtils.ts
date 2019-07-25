import { readdirSync, lstatSync } from "fs-extra"
import { join } from "path"
import { fromEntries } from "."

export const walk = (dir: string): string[] =>
    fromEntries(
        readdirSync(dir).map(item => [
            item,
            lstatSync(join(dir, item)).isDirectory()
                ? walk(join(dir, item))
                : null
        ])
    )
