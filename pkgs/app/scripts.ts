import { scripts, $ } from "@re-do/scripts"
import { shellAsync } from "@re-do/node"
import {
    buildAll,
    createRelease,
    pkgRoot,
    startDev,
    startElectronCmd
} from "./scripts/index"
import { join } from "path"
import { version } from "./package.json"

scripts(
    {
        dev: {
            start: startDev,
            test: $(`echo 'This package has no tests.'`)
        },
        prod: {
            release: () => createRelease(),
            testRelease: $("jest"),
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
