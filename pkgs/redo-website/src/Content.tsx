import "typeface-ubuntu"
import React from "react"
import { makeStyles } from "@material-ui/styles"
import { Theme, Box } from "@material-ui/core"
import { Column } from "redo-components"
import { AppHeader, HowItWorks, SignUp } from "./components"

const stylize = makeStyles((theme: Theme) => ({
    content: {
        position: "absolute",
        padding: theme.spacing(5),
        top: 0,
        height: "100vh",
        width: "100vw",
        overflow: "hidden"
    },
    primary: {
        maxWidth: theme.spacing(50)
    }
}))

export const Content = () => {
    const { content, primary } = stylize()
    return (
        <Column className={content} align="center">
            <Column className={primary} align="center">
                <AppHeader />
                <HowItWorks />
                <SignUp />
            </Column>
        </Column>
    )
}
