import {
    ChatInputCommandInteraction,
    Client,
    Events,
    GatewayIntentBits,
    Presence,
    REST as DiscordRestClient,
    Routes,
} from "discord.js";
import dotenv from "dotenv";
import { InteractionHandler, PresenceUpdateHandler } from "./handler";

dotenv.config();

const DISCORD_ACCESS_TOKEN = process.env.DISCORD_ACCESS_TOKEN || "";
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";

class DiscordAlertBot {
    private readonly client: Client;
    private discordRestClient: DiscordRestClient;
    private interactionHandler: InteractionHandler;
    private presenceUpdateHandler: PresenceUpdateHandler;

    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.DirectMessages,
                GatewayIntentBits.DirectMessageTyping,

            ],
            shards: "auto",
            failIfNotExists: false,
        });
        this.discordRestClient = new DiscordRestClient().setToken(DISCORD_ACCESS_TOKEN);
        this.interactionHandler = new InteractionHandler();
        this.presenceUpdateHandler = new PresenceUpdateHandler(this.client);
    }

    start() {
        this.client
            .login(DISCORD_ACCESS_TOKEN)
            .then(() => {
                this.addClientEventHandlers();
                this.registerSlashCommands();
            })
            .catch((err) => console.error("Error starting bot", err));
    }

    registerSlashCommands() {
        const commands = this.interactionHandler.getSlashCommands();
        this.discordRestClient
            .put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
                body: commands,
            })
            .then((data: any) => {
                console.log(`Successfully registered ${data.length} global application (/) commands`);
            })
            .catch((err) => {
                console.error("Error registering application (/) commands", err);
            });
    }

    addClientEventHandlers() {
        this.client.on(Events.InteractionCreate, (interaction) => {
            this.interactionHandler.handleInteraction(
                interaction as ChatInputCommandInteraction
            );
        });

        this.client.on(Events.PresenceUpdate, (presenceUpdate: Presence) => {
            this.presenceUpdateHandler.handlePresenceUpdate(presenceUpdate);
        });

        this.client.on(Events.ClientReady, () => {
            console.log("Wolffy alert bot client logged in");
        });

        this.client.on(Events.Error, (err: Error) => {
            console.error("Client error", err);
        });
    }
}

const app = new DiscordAlertBot();
app.start();
