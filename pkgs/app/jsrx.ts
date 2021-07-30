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
            lint: $(`prettier --write`),
            typecheck: $(`tsc --noEmit`),
            test: $(`echo 'This package has no tests.'`)
        },
        prod: {
            dryRun: () => createRelease(false),
            publish: () => createRelease(true),
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
