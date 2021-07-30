import { createServer, build } from "vite"
import { killExisting } from "./common"
import { getRendererConfig, getMainConfig, getObserverConfig } from "./build"

export const startDev = async () => {
    killExisting()
    const viteDevServer = await createServer({
        ...getRendererConfig({ watch: true }),
        server: {
            port: Number(process.env.VITE_DEV_SERVER_PORT)
        }
    })
    await viteDevServer.listen()
    await build(getObserverConfig({ watch: true }))
    await build(getMainConfig({ watch: true }))
}
