import { jsrx, $, shell } from "jsrx"
import { join } from "path"
import { createServer, build } from "vite"
import { getWebConfig } from "@re-do/configs"
import { fromHere } from "@re-do/node-utils"

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
        outDir: fromHere("dist"),
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
            build: async () => {
                shell("tsc --noEmit")
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
