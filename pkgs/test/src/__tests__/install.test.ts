import { fromHere, getRedoExecutablePath } from "@re-do/node-utils"
import { join } from "path"
import { existsSync, rmSync } from "fs"
import { version, install } from "../install"

const REDO_DIR = fromHere(".redo")
const VERSION_DIR = join(REDO_DIR, version)
const EXECUTABLE_PATH = getRedoExecutablePath(VERSION_DIR)

const deleteTestDir = () => rmSync(REDO_DIR, { recursive: true, force: true })

describe("installation", () => {
    beforeEach(() => {
        deleteTestDir()
    })
    afterEach(() => {
        deleteTestDir()
    })
    test("works", async () => {
        await install(VERSION_DIR)
        expect(existsSync(EXECUTABLE_PATH)).toBe(true)
    }, 120000)
})
