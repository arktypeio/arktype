import {
    shell,
    fromDir,
    getOs,
    getRedoExecutablePath,
    fromPackageRoot,
    shellAsync,
    killTree,
    ChildProcess
} from "@re-do/node"
import { until } from "@re-do/utils"
import { existsSync, rmSync } from "fs"

const unpackedReleaseDirs = {
    mac: "mac",
    windows: "win-unpacked",
    linux: "linux-unpacked"
}
const unpackedRelease = fromPackageRoot("release", unpackedReleaseDirs[getOs()])
const fromRelease = fromDir(unpackedRelease)
const executable = getRedoExecutablePath(unpackedRelease)

let mainProcess: ChildProcess | undefined

const ensureCleanEnv = async () => {
    rmSync(fromRelease("redo.json"), { force: true })
    rmSync(fromRelease("renderer.launched"), { force: true })
    rmSync(fromRelease("browser.listening"), { force: true })
    if (mainProcess && !mainProcess.killed) {
        await killTree(mainProcess.pid)
        mainProcess.kill()
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
            env: { ENABLE_TEST_HOOKS: "1" },
            stdio: "ignore"
        })
        try {
            // redo.json should be created when main launches
            await until(() => existsSync(fromRelease("redo.json")))
            // renderer.launched should be created when renderer launches
            await until(() => existsSync(fromRelease("renderer.launched")))
            // browser.listening should be created when injected browser script runs
            await until(() => existsSync(fromRelease("browser.listening")), {
                // Longer timeout in case browser needs to be installed
                timeoutSeconds: 30
            })
        } catch (e) {
            throw new Error(
                `Failed to launch app from release. Error message:\n${String(
                    e
                )}`
            )
        }
    }, 60000)
})
