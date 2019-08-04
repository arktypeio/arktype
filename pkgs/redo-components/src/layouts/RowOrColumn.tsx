import React, { FC } from "react"
import { makeStyles } from "@material-ui/styles"
import { Theme } from "@material-ui/core"
import Grid, { GridProps } from "@material-ui/core/Grid"
import { BaseCSSProperties } from "@material-ui/styles/withStyles"

const stylize = makeStyles((theme: Theme) => ({
    root: ({ css }: RowOrColumnProps) => ({
        height: "100%",
        width: "100%",
        alignItems: "flex-start",
        ...css
    })
}))

export type RowOrColumnProps = Omit<GridProps, keyof BaseCSSProperties> & {
    css?: BaseCSSProperties
}

export const RowOrColumn: FC<RowOrColumnProps> = props => {
    const { root } = stylize(props)
    return <Grid container className={root} {...props} />
}
