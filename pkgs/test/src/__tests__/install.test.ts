import { ChildProcess, shellAsync } from "@re-do/node-utils"
import { join } from "path"
import { waitUntil } from "async-wait-until"
import treeKill from "tree-kill"
import psList, { ProcessDescriptor } from "ps-list"
import { rmSync } from "fs"
import { version, install, getExecutablePath } from "../install"

const REDO_DIR = join(__dirname, ".redo")
const VERSION_DIR = join(REDO_DIR, version)
const EXECUTABLE_PATH = getExecutablePath(VERSION_DIR)

let redoMainProcess: ChildProcess | undefined

const getTestRendererProcesses = async () => {
    const allProcesses = await psList()
    return allProcesses.filter(
        ({ cmd }) =>
            cmd &&
            cmd.search(EXECUTABLE_PATH) !== -1 &&
            cmd.search("renderer") !== -1
    )
}

const killOldTestProcesses = async () => {
    const oldProcesses = await getTestRendererProcesses()
    oldProcesses.forEach((p) => process.kill(p.pid))
}

const deleteTestDir = () => rmSync(REDO_DIR, { recursive: true, force: true })

describe("installation", () => {
    beforeEach(async () => {
        await killOldTestProcesses()
        deleteTestDir()
    })
    afterEach(async () => {
        if (redoMainProcess && !redoMainProcess.killed) {
            treeKill(redoMainProcess.pid)
        }
        await killOldTestProcesses()
        deleteTestDir()
    })
    test("works", async () => {
        await install(VERSION_DIR)
        redoMainProcess = shellAsync(EXECUTABLE_PATH, { stdio: "ignore" })
        let redoRendererProcesses: ProcessDescriptor[] = []
        await waitUntil(
            async () => {
                redoRendererProcesses = await getTestRendererProcesses()
                return !!redoRendererProcesses.length
            },
            { timeout: 60000 }
        )
        expect(redoRendererProcesses.length).toBe(1)
    }, 120000)
})
