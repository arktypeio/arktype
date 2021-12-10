import { scripts, $, shell } from "@re-do/scripts"
import { join } from "path"
import { createServer, build } from "vite"
import { fromHere, getWebConfig, checkTypes } from "@re-do/node"

const pkgRoot = fromHere("src")

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
        outDir: fromHere("out"),
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

const start = async () => {
    const viteDevServer = await createServer(getWebsiteConfig({ watch: true }))
    await viteDevServer.listen()
}

scripts(
    {
        dev: {
            start,
            test: $("echo No tests for this package"),
            devTest: $("jest"),
            redo: $("redo launch")
        },
        prod: {
            build: async () => {
                checkTypes()
                await build(getWebsiteConfig())
            }
        }
    },
    {
        excludeOthers: true,
        envFiles: {
            dev: fromHere(".env"),
            prod: fromHere(".env.production")
        }
    }
)
