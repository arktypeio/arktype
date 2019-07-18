import React from "react"
import { makeStyles } from "@material-ui/styles"
import Grid, { GridProps, GridItemsAlignment } from "@material-ui/core/Grid"
import { component } from "blocks"

const stylize = makeStyles({
    grid: ({ flexGrow, grow }: RowOrColumnProps) => ({
        flexGrow: flexGrow ? flexGrow : grow ? 1 : undefined
    })
})

export type RowOrColumnProps = GridProps & {
    reverse?: boolean
    wrap?: boolean
    align?: GridItemsAlignment
    flexGrow?: number
    grow?: boolean
}

export const RowOrColumn = component({
    name: "RowOrColumn",
    defaultProps: {} as Partial<RowOrColumnProps>
})(({ direction, reverse, wrap, align, flexGrow, grow, children, ...rest }) => {
    const { grid } = stylize({ flexGrow, grow })
    return (
        <Grid
            container
            item
            className={grid}
            direction={`${direction}${reverse ? "-reverse" : ""}` as any}
            wrap={wrap ? "wrap" : "nowrap"}
            alignItems={align}
            {...rest}
        >
            {children}
        </Grid>
    )
})
