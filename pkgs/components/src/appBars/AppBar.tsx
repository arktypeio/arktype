import React, { CSSProperties } from "react"
import { Row, RowProps } from "../layouts"
import MuiAppBar, {
    AppBarProps as MuiAppBarProps
} from "@material-ui/core/AppBar"

export type AppBarProps = RowProps & { muiAppBarProps?: MuiAppBarProps } & Pick<
        CSSProperties,
        "height"
    >

export const AppBar = ({
    muiAppBarProps,
    children,
    height = 45,
    ...rest
}: AppBarProps) => (
    <MuiAppBar style={{ position: "sticky", height }} {...muiAppBarProps}>
        <Row align="center" justify="space-between" {...rest}>
            {children}
        </Row>
    </MuiAppBar>
)
