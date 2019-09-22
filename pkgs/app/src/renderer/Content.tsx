import React, { FC } from "react"
import { Router } from "pages"
import { hot } from "react-hot-loader/root"
import { AppContents } from "@re-do/components"

const PossiblyHotContent: FC = () => (
    <AppContents>
        <Router />
    </AppContents>
)

export const Content =
    process.env.NODE_ENV === "development"
        ? hot(PossiblyHotContent)
        : PossiblyHotContent
