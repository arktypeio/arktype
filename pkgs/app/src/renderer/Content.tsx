import React from "react"
import { Router } from "./pages"
import { hot } from "react-hot-loader/root"
import { AppContents } from "@re-do/components"

export const Content = hot(() => (
    <AppContents>
        <Router />
    </AppContents>
))
