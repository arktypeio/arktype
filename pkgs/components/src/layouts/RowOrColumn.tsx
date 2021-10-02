import { CSSProperties } from "react"
import { GridProps } from "@material-ui/core/Grid"

export type RowOrColumnProps = Omit<GridProps, "direction"> & {
    align?: CSSProperties["alignItems"]
    justify?: CSSProperties["justifyContent"]
    grow?: boolean
    reverse?: boolean
    height?: CSSProperties["height"]
    width?: CSSProperties["width"]
    full?: boolean
}

export const toGridProps: (
    direction: "row" | "column",
    props: RowOrColumnProps
) => GridProps = (
    direction,
    { align, grow, height, width, justify, reverse, style, full, ...rest }
) => ({
    container: true,
    item: true,
    wrap: "nowrap",
    alignItems: align ? align : "flex-start",
    justifyContent: justify ? justify : "flex-start",
    style: {
        height: height ? height : full ? "100%" : undefined,
        width,
        flexGrow: grow ? 1 : undefined,
        ...style
    },
    direction: `${direction}${reverse ? "-reverse" : ""}` as any,
    ...rest
})
