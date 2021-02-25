import { createHandler } from "react-statelessly"
import { ipcRenderer } from "electron"

export enum Page {
    Home = "HOME",
    SignIn = "SIGN_IN",
    SignUp = "SIGN_UP",
    Results = "RESULTS"
}

export type Root = {
    token: string
    page: Page
    cardFilter: string
    builderActive: boolean
}

export const initialRoot: Root = {
    token: "",
    page: Page.Home,
    cardFilter: "",
    builderActive: false
}

export const rootHandler = createHandler<Root, Root>({
    builderActive: (value) => {
        console.warn(value)
        if (value) {
            ipcRenderer.sendSync("builder", "open")
        } else {
            ipcRenderer.sendSync("builder", "close")
        }
    }
})
