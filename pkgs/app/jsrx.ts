import { jsrx, $ } from "jsrx"
import { join } from "path"

const clean = "rm -rf dist && mkdir dist"

jsrx(
    {
        shared: {
            build: $(`${clean} && webpack && cp .env dist`)
        },
        dev: {
            start: $(
                `${clean} && npm run build && webpack-dev-server --config webpack.devServer.config.ts --progress --colors`
            ),
            electron: $("electron --remote-debugging-port=9223 ./dist/main.js")
        },
        prod: {
            pack: $(
                "rm -rf release && electron-builder --linux --macos --windows --publish always"
            ),
            publish: $("npm run buildProd && npm run pack")
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
