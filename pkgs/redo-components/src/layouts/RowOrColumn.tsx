import React, { FC } from "react"
import { makeStyles } from "@material-ui/styles"
import Grid, { GridProps, GridItemsAlignment } from "@material-ui/core/Grid"

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

export const RowOrColumn: FC<RowOrColumnProps> = ({
    direction,
    reverse,
    wrap,
    align,
    flexGrow,
    grow,
    ...rest
}) => {
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
        />
    )
}
