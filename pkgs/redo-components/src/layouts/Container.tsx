import React, { FC } from "react"
import { makeStyles } from "@material-ui/styles"
import Grid, { GridProps, GridItemsAlignment } from "@material-ui/core/Grid"
import { BaseCSSProperties } from "@material-ui/styles/withStyles"

const stylize = makeStyles({
    root: (css: BaseCSSProperties) => ({
        ...css
    })
})

export type ContainerProps = Omit<GridProps, "container" | "className"> & {
    css?: BaseCSSProperties
    align?: GridItemsAlignment
}

export const Container: FC<ContainerProps> = ({ css = {}, align, ...rest }) => {
    const { root } = stylize(css)
    return <Grid container className={root} alignItems={align} {...rest} />
}
