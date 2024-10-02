import { format } from "prettier"
import { runAsWorker } from "synckit"

runAsWorker(format)
