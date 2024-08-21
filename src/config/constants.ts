import dotenv from "dotenv";

dotenv.config();

export const BOT_OWNER: string = process.env.BOT_OWNER || "";
export const STATUS_ONLINE: string = 'online'
export const DESKTOP: string = 'desktop'
export const EVENT_MESSAGE: string = 'message'
export const DIRECT_MESSAGE: string = 'DM'
