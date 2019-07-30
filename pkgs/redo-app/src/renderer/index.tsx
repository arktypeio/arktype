import "dotenv/config"
import "reflect-metadata"
import "typeface-ubuntu"
import React from "react"
import ReactDOM from "react-dom"
import { client, store } from "./common"
import { defaultTheme } from "redo-components"
import { initialRoot } from "state"
import { App } from "./App"

const root = document.getElementById("root")

const render = async () => {
    await store.initialize(initialRoot)
    ReactDOM.render(
        <App apolloClient={client as any} theme={defaultTheme} />,
        root
    )
}

render()
