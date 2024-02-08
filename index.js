const fs = require('node:fs');
const path = require('node:path');
const {
    Client,
    Collection,
    Events,
    GatewayIntentBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    Partials,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { token } = require('./config.json');
const { setMatchupWinner, getScores, prettyJson, writeScoresToLeaderboard, validWeek } = require('./modules/functions.module.js');
const { initNewServer, writeObjectToFile, replacer, setLastMatchupMessage, getMatchupsChannelId, getConsoleChannelId, getReactionMap, getMatchups, setReactionMap } = require('./modules/database.module.js');


//#region Boiler Plate

// Create a new client instance
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User, Partials.GuildMember]
});

const collectorFilter = (reaction, user) => {
    console.log(!user.bot)
    return !user.bot;
};


async function getUsers() {
    // get all users in guild

    const guilds = client.guilds.cache;

    for (let [key, guild] of guilds) {
        let res = await guild.members.fetch();
        res.forEach((member) => {
            console.log(member.user.username);
        });
    }
  }

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, async c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);

    await getUsers();
    // await collectReactions();
    // do something every 1 minute
    // setInterval(async function() {
    //     await collectReactions();
    //     postReactionsToChannel();
    //     console.log('done');
    // }, 1000*60*1); // time is in milliseconds. 1000 ms * 60 sec * 15 min
});


client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

//#endregion

client.on(Events.InteractionCreate, async interaction => {
    
    if (interaction.isButton()) {
        buttonHandler(interaction);
        return;
    }
});

function buildMatchupMessage(team1, team2, team1Emoji, team2Emoji, format = "standard", i = null) {
    let text = "";
    let turtle = "<:SAPTurtle:920925578343903262>";
    let puppy = "<:SAPPuppy:921461883784015873>";
    let starfish = "<:SAPStarfish:1093007123845230624>";
    let golden = "<:SAPGoldenRetriever:1093023141032366101>";
    let unicorn = "<:SAPUnicorn:1190375464783577149>";
    if (format != "standard") {
        switch (i) {
            case 0:
                text += `${turtle} Turtle Pack ${turtle}\n`;
                break;
            case 1:
                text += `${puppy} Puppy Pack ${puppy}\n`;
                break;
            case 2:
                text += `${starfish} Star Pack ${starfish}\n`;
                break;
            case 3:
                text += `${golden} Golden Pack ${golden}\n`;
                break;
            case 4:
                text += `${unicorn} Unicorn Pack ${unicorn}\n`;
                break;
        }
    }
    text += `${team1Emoji} **${team1}** vs **${team2}** ${team2Emoji}\n`;
    return text;
}

let lastMatchupMessages = [];
let lastTeam1Emoji = '';
let lastTeam2Emoji = '';

// read configurations in matchup-config channel
client.on(Events.MessageCreate, async message => {



    if (message.author.bot) return; // ignore bot messages

    // let matchupChannelId = await getMatchupsChannelId(message.guild);
    let consoleChannelId = await getConsoleChannelId(message.guild);

    if (message.channel.id !== consoleChannelId) return;

    try {
        let matchUpConfig = JSON.parse(message.content);
        let week = matchUpConfig.week;
        if (!(await validWeek(week, message.guild))) {
            message.reply('The week number is invalid.');
            return;
        }
        let format = matchUpConfig.format;
        let formats = ["standard", "mirror"];
        if (!formats.includes(format)) {
            message.reply('The format is invalid.');
            return;
        }
        let team1Emoji = matchUpConfig.team1.emoji.trim();
        let team2Emoji = matchUpConfig.team2.emoji.trim();
        let team1 = matchUpConfig.team1;
        let team2 = matchUpConfig.team2;
        let playerCount = 0;
        for (let i = 0; i < 11; i++) {
            team1HasPlayer = false;
            team2HasPlayer = false;
            if (team1[`player${i+1}`]) {
                team1HasPlayer = true;
            }
            if (team2[`player${i+1}`]) {
                team2HasPlayer = true;
            }
            if (team1HasPlayer && team2HasPlayer) {
                playerCount++;
            } else {
                if (team1HasPlayer || team2HasPlayer) {
                    message.reply('Teams must have the same number of players.');
                    return;
                }
                break;
            }
        }
        lastMatchupMessages = [];

        let text = buildMatchupMessage(team1.name, team2.name, team1Emoji, team2Emoji);
        lastMatchupMessages.push(text);

        let button1 = new ButtonBuilder({
            emoji: team1Emoji,
            customId: `test-1`,
            style: ButtonStyle.Secondary,
            label: '0'
        });
        let button2 = new ButtonBuilder({
            emoji: team2Emoji,
            customId: `test-2`,
            style: ButtonStyle.Secondary,
            label: '0'
        });

        let matchupMessage = await client.channels.cache.get(consoleChannelId).send({
            content: text,
            components: [
                new ActionRowBuilder().addComponents(button1, button2)
            ]
        });
        

        for (let i = 0; i < playerCount; i++) {
            let text = buildMatchupMessage(team1[`player${i+1}`], team2[`player${i+1}`], team1Emoji, team2Emoji, format, i);
            let button1 = new ButtonBuilder({
                emoji: team1Emoji,
                customId: `test-1`,
                style: ButtonStyle.Secondary,
                label: '0'
            });
            let button2 = new ButtonBuilder({
                emoji: team2Emoji,
                customId: `test-2`,
                style: ButtonStyle.Secondary,
                label: '0'
            });
    
            let matchupMessage = await client.channels.cache.get(consoleChannelId).send({
                content: text,
                components: [
                    new ActionRowBuilder().addComponents(button1, button2)
                ]
            });
            lastMatchupMessages.push(text);
        }
        
        lastTeam1Emoji = team1Emoji;
        lastTeam2Emoji = team2Emoji;

        await setLastMatchupMessage(message.guild, {
            week: week,
            lastMatchupMessages: lastMatchupMessages,
            lastTeam1Emoji: lastTeam1Emoji,
            lastTeam2Emoji: lastTeam2Emoji
        });
        
    } catch (error) {
        console.log(error)
        lastMatchupMessages = [];
        lastTeam1Emoji = '';
        lastTeam2Emoji = '';
        // respond with error
        message.reply('There was an error while parsing the matchup config. Please check the format and try again.');
    }
})

client.on(Events.MessageReactionAdd, async (reaction, user) => {
    if (user.bot) return; // ignore bot reactions
    console.log('reaction added')

    if (!reaction) {
        return;
    }

});

client.on(Events.MessageReactionRemove, async (reaction, user) => {
    console.log('reaction removed')
    if (user.bot) return; // ignore bot reactions

    if (!reaction) {
        return;
    }
});


// when bot is added to server
client.on(Events.GuildCreate, async guild => {
    await initNewServer(guild, client);
})

async function buttonHandler(interaction) {
    console.log('button clicked')
    let customId = interaction.customId;
    let customIdArray = customId.split('-');
    let type = customIdArray[0];
    let team = customIdArray[2];
    let matchupId = customIdArray[1];
    let week = customIdArray[3];
    let userId = interaction.user.id;
    if (type == 'test') {
        return;
    }
    console.log(customId)
    console.log(type, team, matchupId, week, userId);

    if (type == 'vote') {
        let reactionMap = await getReactionMap(interaction.guild);
        let reactions = reactionMap.get(week);
        let team1Votes;
        let team2Votes;
        for (let reactionMapItem of reactions) {
            if  (reactionMapItem.id == matchupId) {
                team1Votes = reactionMapItem.team1Votes;
                team2Votes = reactionMapItem.team2Votes;
                break;
            }
            for (let matchupMessage of reactionMapItem.matchupMessages) {
                if (matchupMessage.id == matchupId) {
                    team1Votes = matchupMessage.player1Votes;
                    team2Votes = matchupMessage.player2Votes;
                    break;
                }
            }
        }

        if (team1Votes == null || team2Votes == null) {
            interaction.reply({ content: 'Something went wrong.', ephemeral: true });
        }

        let teamVote = team == 1 ? team1Votes : team2Votes;
        let teamNonVote = team == 1 ? team2Votes : team1Votes;
    
        if (teamVote.includes(userId)) {
            interaction.reply({ content: 'You already voted for this team.', ephemeral: true });
            return;
        } else {
            teamVote.push(userId);
            // interaction.reply({ content: 'Vote added.', ephemeral: true });
        }

        if (teamNonVote.includes(userId)) {
            teamNonVote.splice(teamNonVote.indexOf(userId), 1);
        }

        let buttons = interaction.message.components[0].components;
        let button1 = buttons[0];
        let button2 = buttons[1];
        let newButton1 = new ButtonBuilder({
            customId: button1.data.custom_id,
            style: ButtonStyle.Secondary,
            label: team1Votes.length,
            emoji: button1.data.emoji
        });
        let newButton2 = new ButtonBuilder({
            customId: button2.data.custom_id,
            style: ButtonStyle.Secondary,
            label: team2Votes.length,
            emoji: button2.data.emoji
        });
        interaction.update({
            components: [
                new ActionRowBuilder().addComponents(newButton1, newButton2)
            ]
        })
    
        console.log(team1Votes, team2Votes);

        await setReactionMap(interaction.guild, reactionMap);

    }

    

    if (type == 'winner') {
        await setMatchupWinner(+matchupId, team, interaction.guild);

        let emoji = '';
        if (team == '0') {
            emoji = '\u{2B1C}'; // Unicode escape sequence for yellow square emoji
        } 
        if (team == '1') {
            emoji = '\u{1F7E5}'; // Unicode escape sequence for red square emoji
        }
        if (team == '2') {
            emoji = '\u{1F7E9}'; // Unicode escape sequence for green square emoji
        }
        // update content of message
        let message = interaction.message.content;
        // remove last character from message
        message = message.substring(0, message.length - 1);
        // add emoji to message
        message += emoji;
        interaction.update({
            content: message
        })

        let scoresMap = await getScores(interaction.guild);
        writeScoresToLeaderboard(client, scoresMap, interaction.guild);
        let scoresString = JSON.stringify(scoresMap, replacer, 2);
        console.log(scoresString);
    }
}

// Log in to Discord with your client's token
client.login(token);