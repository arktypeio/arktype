import React, { MutableRefObject } from "react"
import MuiMenu, { MenuProps as MuiMenuProps } from "@material-ui/core/Menu"
import MuiPopper, {
    PopperProps as MuiPopperProps
} from "@material-ui/core/Popper"
import { MenuList, Paper } from "@material-ui/core"
import MuiClickAwayListener from "@material-ui/core/ClickAwayListener"
import { MenuItemProps as MuiMenuItemProps } from "@material-ui/core/MenuItem"
import { MenuItem } from "./MenuItem"

export type MenuOptions = Record<string, () => any>

export type MenuProps = Partial<MuiPopperProps> & {
    itemProps?: MuiMenuItemProps
    children: {
        anchorTo: MutableRefObject<HTMLElement | null>
        open: boolean
        options: MenuOptions
        onClickAway?: () => void
        onSelectItem?: () => void
    }
}

export const Menu = ({
    itemProps,
    children: { anchorTo, open, options, onClickAway = () => {}, onSelectItem },
    ...rest
}: MenuProps) => {
    return (
        <MuiPopper open={open} anchorEl={anchorTo.current} {...rest}>
            <Paper>
                <MuiClickAwayListener onClickAway={onClickAway}>
                    {Object.entries(options).map(([name, onClick]) => (
                        <MenuItem
                            onClick={() => {
                                onClick()
                                onSelectItem && onSelectItem()
                            }}
                            key={name}
                            {...(itemProps as any)}
                        >
                            {name}
                        </MenuItem>
                    ))}
                </MuiClickAwayListener>
            </Paper>
        </MuiPopper>
    )
}
