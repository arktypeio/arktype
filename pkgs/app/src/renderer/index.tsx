import "dotenv/config"
import "react-hot-loader"
import React from "react"
import ReactDOM from "react-dom"
import { client, store } from "./common"
import { defaultTheme } from "@re-do/components"
import { initialRoot } from "state"
import { App } from "./App"
import { installMissingBrowsers } from "@re-do/test"

const root = document.getElementById("root")
store.mutate(initialRoot)
installMissingBrowsers()
ReactDOM.render(<App apolloClient={client as any} theme={defaultTheme} />, root)
