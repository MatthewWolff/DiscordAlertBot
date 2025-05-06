import { Logger } from "typescript-logging-log4ts-style";
import { inspect } from "node:util";

import { provider } from "./config/logConfig";
import { Message } from "discord.js";
import { MessageCore } from "./model";
import { DIRECT_MESSAGE_CHANNEL_TYPE } from "./config/constants";

export function getLogger(name: string): Logger {
    return provider.getLogger(name);
}

export function discordToString(obj: object): string {
    return inspect(obj);
}

export function extractMessage(message: Message): MessageCore {
    return new MessageCore({
        author: message.author,
        content: message.content,
        timestamp: message.createdTimestamp,
        messageId: message.id,
        channelId: message.channelId,
        isDirectMessage: message.channel.type === DIRECT_MESSAGE_CHANNEL_TYPE,
        inReplyTo: message.reference?.messageId ?? undefined,
    });
}

export function getIntersection(arr1: string[], arr2: string[]): string[] {
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = new Set<string>();

    for (const item of set1) {
        if (set2.has(item)) {
            intersection.add(item);
        }
    }

    return Array.from(intersection);
}

export function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toISOString();
}

export async function filter(arr, callback) {
    const fail = Symbol()
    return (await Promise.all(arr.map(async item => (await callback(item)) ? item : fail))).filter(i => i !== fail)
}

/**
 * Creates a new Map with transformed keys while preserving the original values
 * Supports async key transformations
 * @param originalMap The source map
 * @param transformKey Async function to transform each key
 * @param filterNullKeys Whether to filter out null/undefined keys (default: true)
 * @returns A Promise of a new Map with transformed keys
 */
export async function mapKeysAsync<K, V, NK>(
    originalMap: Map<K, V>,
    transformKey: (key: K) => Promise<NK | null | undefined>,
    filterNullKeys: boolean = true
): Promise<Map<NK, V>> {
    const transformedEntries = await Promise.all(
        Array.from(originalMap.entries())
            .map(async ([key, value]) => [await transformKey(key), value])
    );

    return new Map(
        transformedEntries.filter(([key, _]) => !filterNullKeys || key != null) as [NK, V][]
    );
}
