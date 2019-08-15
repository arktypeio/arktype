import { CSSProperties } from "react"
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

// @ts-ignore: Erroneous error related to pnpm
// https://github.com/microsoft/TypeScript/issues/29221
export const toGridProps: (
    direction: "row" | "column",
    props: RowOrColumnProps
) => GridProps = (
    direction,
    { align, grow, height, width, reverse, style, full, ...rest }
) => ({
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
