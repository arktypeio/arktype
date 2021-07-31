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

jsrx(
    {
        dev: {
            start: startDev,
            typecheck: $(`tsc --noEmit`),
            test: $(`echo 'This package has no tests.'`)
        },
        prod: {
            release: () => createRelease(),
            runProd: () => shellAsync(startElectronCmd)
        },
        shared: {
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
