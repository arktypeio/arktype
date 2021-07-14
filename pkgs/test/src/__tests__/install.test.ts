import { ChildProcess, shellAsync } from "@re-do/node-utils"
import { join } from "path"
import { waitUntil } from "async-wait-until"
import treeKill from "tree-kill"
import psList, { ProcessDescriptor } from "ps-list"
import { rmSync } from "fs"
import { install, getExecutablePath } from "../install"
import { latestVersionAvailable } from "../installHelpers"

const REDO_DIR = join(__dirname, ".redo")
let version_dir : string
let redoMainProcess: ChildProcess | undefined

const getTestRendererProcesses = async () => {
    const allProcesses = await psList()
    return allProcesses.filter(
        ({ cmd }) =>
            cmd &&
            cmd.search(version_dir) !== -1 &&
            cmd.search("renderer") !== -1
    )
}

const killOldTestProcesses = async () => {
    const oldProcesses = await getTestRendererProcesses()
    oldProcesses.forEach((p) => process.kill(p.pid))
}

const deleteTestDir = () => rmSync(REDO_DIR, { recursive: true, force: true })

describe("installation", () => {
    afterEach(async () => {
        if (redoMainProcess && !redoMainProcess.killed) {
            treeKill(redoMainProcess.pid)
        }
        await killOldTestProcesses()
        deleteTestDir()
    })
    test("installing and running 0.0.17 works", async () => {
        version_dir = join(REDO_DIR, "0.0.17")
        await assertRedoInstalledAndRuns()
    }, 120000)
    test("installs and runs latest version", async () => {
        const release = await latestVersionAvailable()
        version_dir = join(REDO_DIR, release)
        await assertRedoInstalledAndRuns()
    },120000)
})

const assertRedoInstalledAndRuns = async () => {
    await install(version_dir)
    const executable_path = getExecutablePath(version_dir)
    redoMainProcess = shellAsync(executable_path, { stdio: "ignore" })
    let redoRendererProcesses: ProcessDescriptor[] = []
    await waitUntil(
        async () => {
            redoRendererProcesses = await getTestRendererProcesses()
            return !!redoRendererProcesses.length
        },
        { timeout: 60000 }
    )
    expect(redoRendererProcesses.length).toBe(1)
}