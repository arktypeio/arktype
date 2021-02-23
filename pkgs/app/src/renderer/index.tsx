import "dotenv/config"
import "react-hot-loader"
import React from "react"
import ReactDOM from "react-dom"
import { client, store } from "./common"
import { initialRoot } from "state"
import { App } from "./App"

const root = document.getElementById("root")
store.mutate(initialRoot)
ReactDOM.render(<App apolloClient={client as any} />, root)
