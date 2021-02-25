import React, { useState } from "react"
import {
    Column,
    TextInput,
    AppBar,
    Icons,
    Button,
    ChipInput
} from "@re-do/components"
import { loadStore } from "@re-do/model"
import { Step } from "@re-do/test"
import { BuilderEvents } from "./StepCards"
import { join } from "path"
import { store } from "renderer/common"

const initialState = {
    name: "",
    tags: [] as string[],
    steps: [] as Step[]
}

export const Builder = () => {
    const [state, setState] = useState(initialState)
    const { name, tags, steps } = state
    const persistedStore = loadStore({ path: join(process.cwd(), "redo.json") })
    return (
        <Column full>
            <AppBar height={120} align="center">
                <Column align="center">
                    <TextInput
                        value={name}
                        placeholder="Test Name"
                        colorTemplate="light"
                        kind="underlined"
                        onChange={(e) =>
                            setState({ ...state, name: e.target.value })
                        }
                    />
                    <ChipInput
                        label="Tags"
                        // TODO: Add existing tags
                        possibleSuggestions={[]}
                        onChange={(tags) => setState({ ...state, tags })}
                    />
                </Column>
            </AppBar>
            <BuilderEvents steps={steps as any} />
            <AppBar kind="bottom" justify="space-around">
                <Button
                    Icon={Icons.close}
                    style={{ color: "white" }}
                    onClick={() => store.mutate({ builderActive: false })}
                />
                <Button
                    Icon={Icons.save}
                    style={{ color: "white" }}
                    onClick={() => {
                        persistedStore.createTest({
                            name,
                            tags,
                            steps: steps as any
                        })
                        console.log(store.getState())
                        store.mutate({ builderActive: false })
                        console.log(store.getState())
                    }}
                />
            </AppBar>
        </Column>
    )
}

// import { readFileSync } from "fs-extra"
// import { remote } from "electron"
// import { resolve } from "path"
// import { launch } from "@re-do/test"
// import { Browser } from "playwright-core"
// import { store } from "renderer/common"
// import { isDev } from "@re-do/utils/dist/node"

// const BROWSER_WINDOW_TITLEBAR_SIZE = 44
// const ELECTRON_TITLEBAR_SIZE = 37
// const DEFAULT_LEARNER_WIDTH = 300

// const getMainWindowBounds = (): Bounds => ({
//     ...remote.getCurrentWindow().getBounds()
// })

// // TODO: Make sure bounds are within screen size
// const setMainWindowBounds = (bounds: Partial<Bounds>) => {
//     remote.getCurrentWindow().unmaximize()
//     remote.getCurrentWindow().setBounds(bounds)
// }

// let lastConnectedBrowser: Browser

// const start = async () => {
//     // Use size and position from the Redo app to launch browser
//     const { height, width, x, y } = getMainWindowBounds()
//     const newMainWindowBounds = { height, width: DEFAULT_LEARNER_WIDTH, x, y }
//     setMainWindowBounds(newMainWindowBounds)
//     const { page, browser } = await launch("chrome", {
//         position: {
//             x: x + DEFAULT_LEARNER_WIDTH,
//             y: y
//         },
//         size: {
//             height: height - BROWSER_WINDOW_TITLEBAR_SIZE,
//             width: width - DEFAULT_LEARNER_WIDTH - 24
//         }
//     })
//     page.on("close", () => deactivateBuilder())
//     lastConnectedBrowser = browser
//     page.goto("https://redo.qa")
//     await page.exposeFunction("notify", notify)
//     const browserJs = readFileSync(
//         resolve(isDev() ? "dist" : __dirname, "observer.js"),
//         "utf-8"
//     )
//     await page.evaluate(browserJs)
//     // TODO: This could cause problems since it's in a side effect (maybe mutations shouldn't happen from side effects?)
//     store.mutate({
//         builder: {
//             lastMainWindowBounds
//         }
//     })
// }

// const stop = async (boundsToRestore: Bounds) => {
//     try {
//         await lastConnectedBrowser.close()
//     } catch (e) {
//         // TODO: Stop from unnecessarily logging an error here
//         console.log("Browser was already disconnected.")
//     }
//     setMainWindowBounds(boundsToRestore)
// }

// export const deactivateBuilder = () => {
//     store.mutate({
//         builder: {
//             active: false,
//             steps: [],
//             testName: "",
//             testTags: []
//         }
//     })
// }

// const notify = (step: Step) => {
//     try {
//         store.mutate({
//             builder: { steps: (steps) => [...steps, step] }
//         })
//     } catch (e) {
//         console.log(e)
//     }
// }
