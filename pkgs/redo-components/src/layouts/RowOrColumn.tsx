import { CSSProperties } from "react"
import { GridProps, GridItemsAlignment } from "@material-ui/core/Grid"
import { ValueFrom } from "redo-utils"

export type RowOrColumnProps = Omit<GridProps, "direction"> & {
    align?: GridItemsAlignment
    grow?: boolean
    reverse?: boolean
    height?: ValueFrom<CSSProperties, "height">
    width?: ValueFrom<CSSProperties, "width">
}

export const toGridProps = (
    direction: "row" | "column",
    { align, grow, height, width, reverse, style, ...rest }: RowOrColumnProps
): GridProps => ({
    container: true,
    item: true,
    wrap: "nowrap",
    alignItems: align,
    style: {
        height,
        width,
        flexGrow: grow ? 1 : undefined,
        ...style
    },
    direction: `${direction}${reverse ? "-reverse" : ""}` as any,
    ...rest
})
