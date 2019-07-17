import "dotenv/config"
import "reflect-metadata"
import "typeface-ubuntu"
import React from "react"
import ReactDOM from "react-dom"
import { client, store } from "./common"
import { theme } from "./themes"
import { initialRoot } from "state"
import { App } from "./App"

const root = document.getElementById("root")

const render = async () => {
    await store.initialize(initialRoot)
    ReactDOM.render(<App apolloClient={client} theme={theme} />, root)
}

render()
