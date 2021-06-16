import { join } from "path"
import { FileStore } from ".."

type Root = {
    a: {
        enabled: boolean
    }[]
}

const fallback: Root = {
    a: []
}

let store: FileStore<Root, {}>

describe("persist", () => {
    beforeEach(() => {
        store = new FileStore(
            fallback,
            {},
            { path: join(__dirname, "store.json"), bidirectional: false }
        )
        store.update(fallback)
    })
    test("works", () => {
        store.model.a.persist({ enabled: true })
        expect(store.get("a")).toStrictEqual([{ enabled: true }])
    })
})
