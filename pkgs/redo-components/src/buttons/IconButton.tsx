import React, { FC } from "react"
import MuiIconButton, {
    IconButtonProps as MuiIconButtonProps
} from "@material-ui/core/IconButton"

export type IconButtonProps = MuiIconButtonProps & { Icon: React.ComponentType }

export const IconButton: FC<IconButtonProps> = ({ Icon, ...rest }) => {
    return (
        <MuiIconButton {...rest}>
            <Icon />
        </MuiIconButton>
    )
}
