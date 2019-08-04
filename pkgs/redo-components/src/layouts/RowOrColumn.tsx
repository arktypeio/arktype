import React, { FC } from "react"
import { makeStyles } from "@material-ui/styles"
import { Theme } from "@material-ui/core"
import Grid, { GridProps } from "@material-ui/core/Grid"
import { BaseCSSProperties } from "@material-ui/styles/withStyles"

const stylize = makeStyles((theme: Theme) => ({
    root: (css: BaseCSSProperties) => ({ ...css })
}))

export type RowOrColumnProps = GridProps & {
    css?: BaseCSSProperties
}

export const RowOrColumn: FC<RowOrColumnProps> = ({ css = {}, ...rest }) => {
    const { root } = stylize(css)
    return <Grid container item className={root} {...rest} />
}
