import { jsrx, $, shell } from "jsrx"
import { join } from "path"

const clean = "rm -rf dist && mkdir dist"

type PlatformString = "linux" | "macos" | "windows"

const publish = (platforms: PlatformString[]) => () => {
    shell("npm run buildProd")
    shell("rm -rf release")
    for (const platform of platforms) {
        try {
            shell(`electron-builder --${platform} --publish always`)
        } catch (e) {
            console.error(
                `Encountered the following error while building platform ${platform}:\n${e}`
            )
        }
    }
}

jsrx(
    {
        shared: {
            build: $(`${clean} && webpack && cp .env resources/icon.png dist`),
        },
        dev: {
            start: $(
                `${clean} && npm run build && webpack-dev-server --config webpack.devServer.config.ts --progress --colors`
            ),
            electron: $("electron --remote-debugging-port=9223 ./dist/main.js"),
        },
        prod: {
            publish: publish(["linux", "macos", "windows"]),
            publishLinux: publish(["linux"]),
            publishMac: publish(["macos"]),
            publishWindows: publish(["windows"]),
        },
    },
    {
        excludeOthers: true,
        envFiles: {
            dev: join(__dirname, ".env"),
            prod: join(__dirname, ".env.production"),
        },
    }
)
