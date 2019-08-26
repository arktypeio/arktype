import { generateModel } from "../generateModel"
import { resolvers } from "../resolvers"
import { authChecker } from "../auth"
import { join} from "path"
import { existsSync, mkdtempSync, removeSync } from "fs-extra"

let inDir: string
let atPath: string

beforeAll(() => {
    inDir = mkdtempSync("temp-")
    atPath = join(inDir, "datamodel.prisma")
})

afterAll(() => {
    removeSync(inDir)
})

afterEach(() => {
    removeSync(atPath)
})

test("handles Redo's model", () => {
    generateModel({
        resolvers,
        authChecker,
        atPath
    })
    expect(existsSync(atPath)).toBe(true)
})
