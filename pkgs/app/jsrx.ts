import { jsrx, $ } from "jsrx"
import { shellAsync } from "@re-do/node-utils"
import {
    buildAll,
    createRelease,
    pkgRoot,
    startDev,
    startElectronCmd
} from "./scripts"
import { join } from "path"
import { version } from "./package.json"

jsrx(
    {
        dev: {
            start: startDev,
            test: $(`echo 'This package has no tests.'`)
        },
        prod: {
            release: () => createRelease(),
            testRelease: $("jest --detectOpenHandles"),
            runProd: () => shellAsync(startElectronCmd),
            version: $(`echo ${version}`),
            build: buildAll
        }
    },
    {
        excludeOthers: true,
        envFiles: {
            dev: join(pkgRoot, ".env")
        }
    }
)
