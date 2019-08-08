import React from "react"
import { makeStyles } from "@material-ui/styles"
import { Card } from "redo-components"
import { Theme } from "@material-ui/core"

const stylize = makeStyles((theme: Theme) => ({
    background: {
        background: theme.palette.background.paper
    },
    skewedHeader: {
        position: "absolute",
        width: "100%",
        top: -theme.spacing(100),
        height: theme.spacing(134),
        transform: "skewY(-6deg)"
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
