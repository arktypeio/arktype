import React from "react"
import { DefaultTheme } from "@re-do/components"
import { StatelessProvider } from "react-statelessly"
import { Router } from "./Router.js"
import { store } from "renderer/common"

export const App = () => (
    <StatelessProvider store={store}>
        <DefaultTheme>
            <Router />
        </DefaultTheme>
    </StatelessProvider>
)
