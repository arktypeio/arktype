import {
    shell,
    fromDir,
    getOs,
    getRedoExecutablePath,
    fromPackageRoot,
    shellAsync,
    killTree,
    ChildProcess
} from "@re-do/node-utils"
import { until } from "@re-do/utils"
import { existsSync, rmSync } from "fs"

const unpackedRelease = fromPackageRoot("release", `${getOs()}-unpacked`)
const fromRelease = fromDir(unpackedRelease)
const executable = getRedoExecutablePath(unpackedRelease)

let mainProcess: ChildProcess | undefined

const ensureCleanEnv = async () => {
    rmSync(fromRelease("redo.json"), { force: true })
    rmSync(fromRelease("renderer.launched"), { force: true })
    if (mainProcess && !mainProcess.killed) {
        await killTree(mainProcess.pid)
    }
}

describe("installation", () => {
    beforeAll(() => {
        if (!existsSync(executable)) {
            throw new Error(
                `Expected release executable at ${executable} didn't exist.\n` +
                    `Please ensure you run 'release' before running e2e tests.'`
            )
        }
    })
    beforeEach(async () => {
        await ensureCleanEnv()
    })
    afterEach(async () => {
        await ensureCleanEnv()
    })
    test("app release launches", async () => {
        mainProcess = shellAsync(executable, {
            cwd: unpackedRelease,
            env: { ENABLE_TEST_HOOKS: "1" }
        })
        // redo.json should be created when main launches
        await until(() => existsSync(fromRelease("redo.json")))
        // renderer.launched should be created when renderer launches
        await until(() => existsSync(fromRelease("renderer.launched")))
    }, 30000)
})
