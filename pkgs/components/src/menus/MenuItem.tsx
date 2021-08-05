import React from "react"
import MuiMenuItem, {
    MenuItemProps as MuiMenuItemProps
} from "@material-ui/core/MenuItem"

//Mui's button prop type isn't compatible with itself. Somehow.
export type MenuItemProps = MuiMenuItemProps & { button?: true }

export const MenuItem = React.forwardRef<HTMLLIElement, MenuItemProps>(
    (props, ref) => <MuiMenuItem ref={ref} {...props} />
) as React.FunctionComponent<MenuItemProps>
