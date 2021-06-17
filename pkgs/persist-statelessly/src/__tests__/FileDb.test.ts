import { join } from "path"
import { createFileDb, FileDb } from ".."

type Root = {
    a: {
        enabled: boolean
    }[]
}

const fallback: Root = {
    a: []
}

let db: FileDb<Root>

describe("persist", () => {
    beforeEach(() => {
        db = createFileDb({
            fallback,
            path: join(__dirname, "store.json"),
            bidirectional: false
        })
    })
    test("works", () => {
        db.a.persist({ enabled: true })
        expect(db.a.retrieve()).toStrictEqual([{ enabled: true }])
    })
})
