import React, { FC } from "react"
import { TextInput } from "../inputs"
import { Row, RowProps } from "../layouts"
import MuiAppBar, {
    AppBarProps as MuiAppBarProps
} from "@material-ui/core/AppBar"

export type AppBarProps = RowProps & { muiAppBarProps?: MuiAppBarProps }

export const AppBar: FC<AppBarProps> = ({
    muiAppBarProps,
    children,
    ...rest
}) => {
    return (
        <MuiAppBar {...muiAppBarProps}>
            <Row align="center" justify="space-between" {...rest}>
                {children}
            </Row>
        </MuiAppBar>
    )
}
