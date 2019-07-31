import "typeface-ubuntu"
import React from "react"
import { makeStyles } from "@material-ui/styles"
import { Theme } from "@material-ui/core"
import { Column } from "redo-components"
import { AppHeader, HowItWorks, SignUp } from "./components"

const stylize = makeStyles((theme: Theme) => ({
    content: {
        position: "absolute",
        padding: theme.spacing(5),
        top: 0,
        height: "100vh",
        width: "100vw"
    },
    column: {
        maxWidth: theme.spacing(100)
    }
}))

export const Content = () => {
    const { content, column } = stylize()
    return (
        <Column className={content} align="center">
            <AppHeader />
            <Column className={column}>
                <HowItWorks />
                <SignUp />
            </Column>
        </Column>
    )
}
