import { jsrx, $, shell } from "jsrx"
import { join } from "path"
import { createServer, build } from "vite"
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

type GetConfigArgs = {
    watch?: boolean
}

const getWebsiteConfig = ({ watch }: GetConfigArgs = {}) =>
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

const start = async () => {
    const viteDevServer = await createServer(getWebsiteConfig({ watch: true }))
    await viteDevServer.listen()
}

jsrx(
    {
        dev: {
            start,
            test: $("jest"),
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
            dev: join(__dirname, ".env"),
            prod: join(__dirname, ".env.production")
        }
    }
)
