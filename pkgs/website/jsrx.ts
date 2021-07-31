import { jsrx, $, shell } from "jsrx"
import { join } from "path"
import { createServer, build } from "vite"
import { getWebConfig } from "@re-do/configs"
import { dirPath } from "@re-do/node-utils"

// @ts-ignore
const dirName = dirPath(import.meta.url)

const pkgRoot = join(dirName, "src")

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

type GetConfigArgs = {
    watch?: boolean
}

const getWebsiteConfig = ({ watch = false }: GetConfigArgs = {}) =>
    getWebConfig({
        srcDir: pkgRoot,
        outDir: join(dirName, "dist"),
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

const start = async () => {
    const viteDevServer = await createServer(getWebsiteConfig({ watch: true }))
    await viteDevServer.listen()
}

jsrx(
    {
        dev: {
            start,
            test: $("echo No tests for this package"),
            devTest: $("jest"),
            redo: $("redo launch")
        },
        prod: {},
        shared: {
            build: () => build(getWebsiteConfig())
        }
    },
    {
        excludeOthers: true,
        envFiles: {
            dev: join(dirName, ".env"),
            prod: join(dirName, ".env.production")
        }
    }
)
