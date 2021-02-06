import { join } from "path"
import { loadStore } from "../model"
import { removeSync } from "fs-extra"

describe("store", () => {
    const path = join(__dirname, "redo.json")
    removeSync(path)
    const store = loadStore({ path })
    test("can retrieve existing tests", () => {
        expect(store.getTests()).toStrictEqual([])
    })
    test("can create new tests", () => {
        const newTest = { name: "New Test", steps: [], tags: [] }
        store.createTest(newTest)
        expect(store.getTests()).toStrictEqual([newTest])
        store.createTest(newTest)
        expect(store.getTests()).toStrictEqual([newTest, newTest])
    })
})
