import React, { CSSProperties } from "react"
import { Row, RowProps } from "../layouts"
import MuiAppBar, {
    AppBarProps as MuiAppBarProps
} from "@material-ui/core/AppBar"
import { makeKinds, KindFrom } from "../common"

const useStyleKind = makeKinds<CSSProperties>()(() => ({
    top: {
        top: 0
    },
    bottom: {
        bottom: 0,
        top: "auto"
    }
}))

export type FloatBarProps = RowProps &
    Pick<CSSProperties, "height"> & {
        muiAppBarProps?: MuiAppBarProps
        kind?: KindFrom<typeof useStyleKind>
    }

export const FloatBar = ({
    muiAppBarProps,
    children,
    height = 45,
    kind = "top",
    ...rest
}: FloatBarProps) => {
    const kindStyles = useStyleKind(kind)
    const { style: muiAppBarStyles, ...muiAppBarRest } = muiAppBarProps
        ? muiAppBarProps
        : { style: {} }
    return (
        <div style={{ height }}>
            <MuiAppBar
                style={{ ...kindStyles, height, ...muiAppBarStyles }}
                {...muiAppBarRest}
            >
                <Row align="center" justify="space-between" full {...rest}>
                    {children}
                </Row>
            </MuiAppBar>
        </div>
    )
}
