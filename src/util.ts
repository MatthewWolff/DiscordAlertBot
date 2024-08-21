import { Logger } from "typescript-logging-log4ts-style";
import { inspect } from "node:util";

import { provider } from "./config/logConfig";

export function getLogger(name: string): Logger {
    return provider.getLogger(name);
}

export function discordToString(obj: any): string {
    return inspect(obj);
}
