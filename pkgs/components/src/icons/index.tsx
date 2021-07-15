import React from "react"
import account from "@material-ui/icons/Person"
import add from "@material-ui/icons/Add"
import back from "@material-ui/icons/ArrowBack"
import blog from "@material-ui/icons/Notes"
import cancel from "@material-ui/icons/Cancel"
import close from "@material-ui/icons/Close"
import code from "@material-ui/icons/Code"
import collapse from "@material-ui/icons/ExpandMore"
import dropdown from "@material-ui/icons/MoreVert"
import edit from "@material-ui/icons/Edit"
import email from "@material-ui/icons/Email"
import expandDown from "@material-ui/icons/ExpandMore"
import expandRight from "@material-ui/icons/ChevronRight"
import gitHub from "@material-ui/icons/GitHub"
import help from "@material-ui/icons/HelpOutline"
import home from "@material-ui/icons/Home"
import linkedIn from "@material-ui/icons/LinkedIn"
import menu from "@material-ui/icons/Menu"
import menuBook from "@material-ui/icons/MenuBook"
import openModal from "@material-ui/icons/OpenInNew"
import run from "@material-ui/icons/PlayArrow"
import save from "@material-ui/icons/Done"
import schedule from "@material-ui/icons/Schedule"
import settings from "@material-ui/icons/Settings"
import trash from "@material-ui/icons/Delete"
import twitter from "@material-ui/icons/Twitter"
import video from "@material-ui/icons/VideocamOutlined"
import view from "@material-ui/icons/RemoveRedEye"
import SvgIcon, { SvgIconProps } from "@material-ui/core/SvgIcon"
import { twitchPath } from "./paths"

const toIcon = (path: string) => (props: SvgIconProps) => (
    <SvgIcon {...props}>
        <path d={path} />
    </SvgIcon>
)

const twitch = toIcon(twitchPath)

export const Icons: Record<string, typeof SvgIcon> = {
    account,
    add,
    back,
    blog,
    cancel,
    close,
    code,
    collapse,
    dropdown,
    edit,
    email,
    expandDown,
    expandRight,
    gitHub,
    help,
    home,
    linkedIn,
    menu,
    menuBook,
    openModal,
    run,
    save,
    schedule,
    settings,
    trash,
    twitch,
    twitter,
    video,
    view
}
