import {
    ChatInputCommandInteraction,
    Client,
    Events,
    GatewayIntentBits,
    Message,
    Partials,
    Presence,
    REST as DiscordRestClient,
    Routes,
} from "discord.js";
import dotenv from "dotenv";

import { InteractionHandler, MessageHandler, PresenceUpdateHandler } from "./handler";
import { getLogger } from "./util";
import {MessageCore} from "./model";

dotenv.config();

const DISCORD_ACCESS_TOKEN = process.env.DISCORD_ACCESS_TOKEN || "";
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";

const logger = getLogger("service.bot");

class DiscordAlertBot {
    private readonly client: Client;
    private discordRestClient: DiscordRestClient;
    private interactionHandler: InteractionHandler;
    private presenceUpdateHandler: PresenceUpdateHandler;
    private messageHandler: MessageHandler;

    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageTyping,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.DirectMessageTyping,
            ],
            partials: [Partials.Channel], // for DMs
            shards: "auto",
            failIfNotExists: false,
        });
        this.discordRestClient = new DiscordRestClient().setToken(DISCORD_ACCESS_TOKEN);
        this.interactionHandler = new InteractionHandler(this.client);
        this.presenceUpdateHandler = new PresenceUpdateHandler(this.client);
        this.messageHandler = new MessageHandler(this.client);
    }

    start() {
        this.client
            .login(DISCORD_ACCESS_TOKEN)
            .then(() => {
                this.addClientEventHandlers();
                this.registerSlashCommands();
            })
            .catch((err) => logger.error("Error starting bot", err));
    }

    registerSlashCommands() {
        const commands = this.interactionHandler.getSlashCommands();
        this.discordRestClient
            .put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
                body: commands,
            })
            .then((data: any) => {
                logger.info(`Successfully registered ${data.length} global application (/) commands`);
            })
            .catch((err) => {
                logger.error("Error registering application (/) commands", err);
            });
    }

    addClientEventHandlers() {
        this.client.on(Events.InteractionCreate, (interaction) => {
            this.interactionHandler.handle(interaction as ChatInputCommandInteraction);
        });

        this.client.on(Events.PresenceUpdate, (_: Presence, newPresence: Presence) => {
            this.presenceUpdateHandler.handle(newPresence);
        });

        this.client.on(Events.MessageCreate, (message: Message) => {
            this.messageHandler.handle(message);
        });

        this.client.on(Events.ClientReady, () => {
            logger.info("Wolffy alert bot client logged in");
        });

        this.client.on(Events.Error, (err: Error) => {
            logger.error("Client error", err);
        });
    }
}

const app = new DiscordAlertBot();
app.start();
