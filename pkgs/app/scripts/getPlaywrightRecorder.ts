import { shell } from "@re-do/node-utils"
import { join } from "path"
import { packageJsonContents, srcDir } from "./common"

export const getPlaywrightRecorder = () => {
    shell(
        `git clone --depth 1 --branch v${packageJsonContents.dependencies["playwright"]} git@github.com:microsoft/playwright.git`,
        { cwd: join(srcDir, "main") }
    )
}
