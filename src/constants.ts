export const STATUS_ONLINE: string = 'online'
export const DESKTOP: string = 'desktop'
export const STATUS_DND: string = 'dnd'
export interface UserAlerts {
    [userId: string]: {
        [receiverId: string]: string[];
    };
}