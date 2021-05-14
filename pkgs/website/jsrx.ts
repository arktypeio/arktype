import { jsrx, $, shell } from "jsrx"
import { join } from "path"
import { createServer, build } from "vite"
import { getWebsiteConfig } from "./viteConfigs"

const start = async () => {
    const viteDevServer = await createServer(getWebsiteConfig({ watch: true }))
    await viteDevServer.listen()
}

jsrx(
    {
        dev: {
            start
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
