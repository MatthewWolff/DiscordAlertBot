# Discord Bot for Game Alerts

Have you ever wanted your friends to get notified when you start up a game?  
Have you only wanted certain friends to get notified about certain games?  
This is the bot for you!

This bot monitors the gaming activity of users in your Discord server and sends alerts to specified users when their friends start playing certain games.

## Features

- Monitors user presence for game activity
- Allows users to subscribe to game alerts for specific friends
- Supports adding and removing game subscriptions via commands
- Provides commands to view current subscriptions and subscribers
- Implements a cooldown system to prevent spam
- Forwards messages from subscribers to the target user

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (I used v22)
- [Yarn](https://yarnpkg.com/)

### Discord Bot Setup

1. Create a new Discord application in the [Discord Developer Portal](https://discord.com/developers/applications).
2. Add a bot to your application and copy the bot token.
3. Invite the bot to your server with necessary permissions. You'll follow [general instructions for setting up a discord bot](https://www.ionos.com/digitalguide/server/know-how/creating-discord-bot/).


### Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/discord-game-alert-bot.git
   cd discord-game-alert-bot
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Copy the `.env.example` file to `.env` and update it with your bot token and other necessary values:
   ```bash
   cp .env.example .env
   ```

4. Start the bot:
   ```bash
   yarn start
   ```

## Usage

### Commands

- `/notifier add <watcher> <notifier> <game>`: Add a game subscription
- `/notifier remove <watcher> <notifier> <game>`: Remove a game subscription
- `/notifier get-subscriptions [user]`: View games you're subscribed to (or another user's, if specified)
- `/notifier get-subscribers [user]`: View who is subscribed to your games (or another user's, if specified)

### Database Structure

The bot uses a JSON file (`gameMap.json`) to store subscription data. Here's an example structure:

```json
{
  "users": {
    "Matthew": {
      "userId": "222537364092289024",
      "subscribers": {
        "Joshy": ["HITMAN World of Assassination", "HITMAN 3"],
        "MJ": ["League of Legends", "Marvel Rivals"]
      }
    },
    "Joshy": {
      "userId": "222189792489046017",
      "subscribers": {}
    },
    "MJ": {
      "userId": "222129559303487488",
      "subscribers": {}
    }
  }
}
```

In the example above (user IDs have been changed), we can provide a human-readable name among the list of games.

When `Matthew` has a change in gaming presence, the bot will check if the game name has a hit for any of the subscribers,
at which point the bot will message them. If he plays Marvel Rivals, then `MJ` will receive a message about that.


### Privacy and Permissions

For the bot to function correctly:
1. Users must share a server with the bot
2. Allow messages from server members (at least for the shared server)
3. Have their privacy settings configured to allow non-friends to message them

### Anti-Spam Measures

The bot implements a 2-hour cooldown per game to prevent excessive notifications.

### Message Forwarding

When subscribers reply to the bot's alerts, their messages are forwarded to the notifying user. The user can reply using the `reply` function on the forwarded message.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the GNU General License - see the [LICENSE](LICENSE) file for details.