import React from "react"
import { makeStyles, useTheme, ThemeProvider } from "@material-ui/styles"
import { AnimatedLogo } from "./AnimatedLogo"
import {
    Typography,
    TextField,
    Button,
    createMuiTheme
} from "@material-ui/core"
import { yellow, blue } from "@material-ui/core/colors"
import "typeface-roboto"
import { defaultTheme } from "redo-components"

const style = makeStyles({
    content: {
        display: "flex",
        position: "absolute",
        flexDirection: "column",
        justifyContent: "space-around",
        top: "0",
        width: "100vw",
        height: "100vh"
    },
    header: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-around",
        alignItems: "center",
        flexGrow: 1
    },
    explainHeader: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        flexGrow: 2
    },
    explainContent: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "flex-start",
        flexGrow: 2,
        width: "100vw"
    },
    explain: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        flexGrow: 2
    },
    email: {
        display: "flex",
        flexDirection: "column",
        alignSelf: "center",
        justifyContent: "space-around",
        flexGrow: 0.5
    }
})

export const Content = () => {
    const {
        header,
        content,
        explain,
        explainContent,
        explainHeader,
        email
    } = style()
    return (
        <div className={content}>
            <div className={header}>
                <AnimatedLogo />
                <Typography variant="h2">
                    Free automated testing that builds itself.
                </Typography>
            </div>
            <div className={explain}>
                <div className={explainHeader}>
                    <Typography variant="h3">How it works:</Typography>
                </div>
                <div className={explainContent}>
                    <Typography>1.</Typography>
                    <Typography>2.</Typography>
                    <Typography>3.</Typography>
                </div>
            </div>
            <Typography variant="h3" className={email}>
                Sign up to be notified on release!
            </Typography>
            <div className={email}>
                <TextField
                    type="text"
                    name="email"
                    placeholder="email"
                    variant="outlined"
                    color="secondary"
                />
                <Button variant="contained" color="primary">
                    Sign up!
                </Button>
            </div>
        </div>
    )
}
