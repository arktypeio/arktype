import React, { CSSProperties } from "react"
import { GridProps, GridItemsAlignment } from "@material-ui/core/Grid"
import { ValueFrom } from "redo-utils"

export type RowOrColumnProps = Omit<GridProps, "direction"> & {
    align?: GridItemsAlignment
    grow?: boolean
    reverse?: boolean
    height?: ValueFrom<CSSProperties, "height">
    width?: ValueFrom<CSSProperties, "width">
    full?: boolean
}

export const toGridProps = (
    direction: "row" | "column",
    {
        align,
        grow,
        height,
        width,
        reverse,
        style,
        full,
        ...rest
    }: RowOrColumnProps
): GridProps => ({
    container: true,
    item: true,
    wrap: "nowrap",
    alignItems: align ? align : "flex-start",
    style: {
        height: height ? height : full ? "100%" : undefined,
        width,
        flexGrow: grow ? 1 : undefined,
        ...style
    },
    direction: `${direction}${reverse ? "-reverse" : ""}` as any,
    ...rest
})
