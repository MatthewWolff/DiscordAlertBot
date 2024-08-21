import { LogLevel } from "typescript-logging";
import { Log4TSProvider } from "typescript-logging-log4ts-style";

export const provider = Log4TSProvider.createProvider("DiscordAlertBotProvider", {
    /* Specify the various group expressions to match against */
    groups: [
        { expression: new RegExp("helper.+"), level: LogLevel.Warn },
        { expression: new RegExp("command.+"), level: LogLevel.Info },
        { expression: new RegExp("handler.+"), level: LogLevel.Debug },
        { expression: new RegExp("service.+"), level: LogLevel.Info },
    ],
});
