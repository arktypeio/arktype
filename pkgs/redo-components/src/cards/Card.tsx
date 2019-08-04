import React, { FC } from "react"
import { Card as MuiCard, Theme } from "@material-ui/core"
import { CardProps as MuiCardProps } from "@material-ui/core/Card"
import { makeStyles } from "@material-ui/styles"
import { BaseCSSProperties } from "@material-ui/styles/withStyles"

const stylize = makeStyles((theme: Theme) => ({
    root: (css?: BaseCSSProperties) => ({
        width: "fit-content",
        padding: theme.spacing(1),
        ...css
    })
}))

export type CardProps = MuiCardProps & {
    css?: BaseCSSProperties
}

export const Card = ({ css, ...rest }: CardProps) => {
    const { root } = stylize(css)
    return <MuiCard className={root} {...rest} />
}
