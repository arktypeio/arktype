import { ChildProcess, shellAsync } from "@re-do/node-utils"
import { join } from "path"
import { waitUntil } from "async-wait-until"
import treeKill from "tree-kill"
import psList, { ProcessDescriptor } from "ps-list"
import { rmSync } from "fs"
import { install } from "../install"

const APP_PATH = join(__dirname, "redo")
let redoMainProcess: ChildProcess | undefined

describe("installation", () => {
    afterEach(() => {
        if (redoMainProcess && !redoMainProcess.killed) {
            treeKill(redoMainProcess.pid)
        }
        rmSync(APP_PATH, { force: true })
    })
    test("works", async () => {
        await install(APP_PATH)
        redoMainProcess = shellAsync(APP_PATH)
        let redoRendererProcesses: ProcessDescriptor[] = []
        await waitUntil(
            async () => {
                const allProcesses = await psList()
                redoRendererProcesses = allProcesses.filter(
                    (_) => _.cmd && _.cmd.search("redo --type=renderer") !== -1
                )
                return !!redoRendererProcesses.length
            },
            { timeout: 5000 }
        )
        expect(redoRendererProcesses.length).toBe(1)
    }, 60000)
})
