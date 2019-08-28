import React, { FC } from "react"
import { PageRouter } from "pages"
import { hot } from "react-hot-loader/root"
import { AppContents } from "@re-do/components"

const PossiblyHotContent: FC = () => (
    <AppContents>
        <PageRouter />
    </AppContents>
)

export const Content =
    process.env.NODE_ENV === "development"
        ? hot(PossiblyHotContent)
        : PossiblyHotContent
