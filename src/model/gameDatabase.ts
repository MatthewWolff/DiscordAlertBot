export interface GameDatabase {
    [userId: string]: {
        [friendId: string]: string[];
    };
}
