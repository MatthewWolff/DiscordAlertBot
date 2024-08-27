# Discord Bot for Alerting based on Games
Have you ever wanted your friends to get notified when you start up a game? 
Have you only wanted certain friends to get notified about certain games?
This is the bot for you!

This repo will create a bot that waits in your server and monitors the presences of its users,
alerting certain users when a target user has started to play a game.

### how do I set it up?
You'll need to add the bot to your server. You'll follow [general instructions for setting up a discord bot](https://www.ionos.com/digitalguide/server/know-how/creating-discord-bot/?srsltid=AfmBOoogK0zH0ddtPJA6NFx8_I_iSkgc2i-fAlQV0r1qed6mc6AQlRrn).

You can provide a mapping of target to subscriber along with which games the subscriber should be informed about:

#### gameMap.json
```json
{
  "164537364092289024": {
    "MATTHEW": [],
    "265210485812923088": [
      "TYLER",
      "Overwatch 2",
      "Risk of Rain 2",
      "Deadlock"
    ],
    "225142521024610302": [
      "BRYAN",
      "Risk of Rain 2",
      "Don't Starve Together"
    ]
  }
}
```

In the example above (user IDs have been changed), we can provide a human-readable name among the list of games.

When MATTHEW has a change in gaming presence, the bot will check if the game name has a hit for any of the subscribers,
at which point the bot will message them. If he plays Overwatch 2, then TYLER will receive a message about that.

### Can the bot message anyone?
No, all user IDs above will need to:
1. share a server with the bot
2. allow messages from server members (at least for the shared server)
3. have their privacy setting configured so that non-friends can message them

### How to avoid spam?
The bot has a built-in 2 hour cool-off after messaging a user about a particular game. This cool-off is *per game*.

### What if my friends reply to the bot?
The bot will forward their message to you

### Can I reply back?
Yes, you'll need to use the `reply` function directly on the message that the bot forwards you

---

## Prerequisites

Before you start, make sure you have the following installed:

- [Node.js](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/)

## Running
1. Create a new Discord bot and obtain the token. You can do this by creating a new application on the [Discord Developer Portal](https://discord.com/developers/applications).
2. Rename the `.env.example` file to `.env` and update the fields with the neccesarry values
3. Install dependencies using Yarn and start the bot

```bash
yarn # installs dependencies
yarn start
```
