import React from "react"
import { makeStyles, createStyles } from "@material-ui/styles"
import { Card } from "redo-components"
import { Theme } from "@material-ui/core"

const stylize = makeStyles((theme: Theme) => ({
    background: {
        overflow: "hidden",
        height: "100vh",
        width: "100vw",
        position: "absolute",
        background: theme.palette.background.paper
    },
    skewedHeader: {
        position: "absolute",
        width: "100%",
        top: -theme.spacing(100),
        height: theme.spacing(134),
        transform: "skewY(-6deg)",
        transformOrigin: "top middle"
    }
}))

export const Background = () => {
    const { background, skewedHeader } = stylize()
    return (
        <div className={background}>
            <Card elevation={20} className={skewedHeader} />
        </div>
    )
}
