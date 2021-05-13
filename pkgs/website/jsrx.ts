import { jsrx, $, shell } from "jsrx"
import { createServer, build } from "vite"
import { getWebsiteConfig } from "./viteConfigs"

const start = async () => {
    const viteDevServer = await createServer(getWebsiteConfig({ watch: true }))
    await viteDevServer.listen()
}

jsrx({
    dev: {
        start
    },
    prod: {},
    shared: {
        build: () => build(getWebsiteConfig())
    }
})
