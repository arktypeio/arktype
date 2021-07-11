import { join } from "path"
import { getWebConfig } from "@re-do/configs"

const pkgRoot = join(__dirname, "src")

const localResolves = [
    { find: "components", replacement: join(pkgRoot, "components") },
    {
        find: "content",
        replacement: join(pkgRoot, "content")
    },
    { find: "pages", replacement: join(pkgRoot, "pages") },
    {
        find: "assets",
        replacement: join(pkgRoot, "assets")
    }
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
            },
            assetsInclude: ["**/*.md"]
        }
    })
