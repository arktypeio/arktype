import { join } from "path"
import { getWebConfig } from "@re-do/bundle"

const pkgRoot = join(__dirname, "src")

const localResolves = [
    { find: "components", replacement: join(pkgRoot, "components") },
    {
        find: "content",
        replacement: join(pkgRoot, "content")
    },
    { find: "pages", replacement: join(pkgRoot, "pages") }
]

export type GetConfigArgs = {
    watch?: boolean
}

export const getWebsiteConfig = ({ watch }: GetConfigArgs = {}) =>
    getWebConfig({
        srcDir: pkgRoot,
        outDir: join(__dirname, "dist"),
        watch,
        options: {
            resolve: {
                alias: localResolves
            },
            server: {
                port: Number(process.env.VITE_DEV_SERVER_PORT)
            }
        }
    })
