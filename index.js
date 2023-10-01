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
    Partials
} = require('discord.js');
const { token, matchUpConfigId, matchUpsId, reactionsId, guildId } = require('./config.json');


function replacer(key, value) {
    if(value instanceof Map) {
      return {
        dataType: 'Map',
        value: Array.from(value.entries()), // or with spread: value: [...value]
      };
    } else {
      return value;
    }
}

function reviver(key, value) {
    if(typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
        return new Map(value.value);
        }
    }
return value;
}

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

async function collectReactions() {
    let messageReactionMap = new Map();
    let matchupsChannel = client.channels.cache.get(matchUpsId);
    await matchupsChannel.messages.fetch({ limit: 100 }).then(async messages => {
        console.log(`Received ${messages.size} messages`);
        let mssgArray = Array.from(messages.values());
        // console.log(mssgArray[0]);
        for (let message of mssgArray) {
            let reactionUserMap = new Map();
            messageReactionMap.set(message.id, reactionUserMap);

            message.reactions.cache.forEach(async (reaction) => {
                // await reaction.message.channel.messages.cache.delete(reaction.message.id);
                // await reaction.message.reactions.cache.clear();
                // let message = await reaction.message.fetch();
                reaction.users.cache.forEach((user) => {
                    console.log(user.username);
                })
                
                await processReactionEvent(reaction);
            });
            
        }

        // console.log(messageReactionMap)
    }).catch(console.error);
}

async function getUsers() {
    // get all users in guild

    const guild = client.guilds.cache.get(guildId);

    let res = await guild.members.fetch();
    res.forEach((member) => {
        console.log(member.user.username);
    });
  }

// When the client is ready, run this code (only once)
// We use 'c' for the event parameter to keep it separate from the already defined 'client'
client.once(Events.ClientReady, async c => {
	console.log(`Ready! Logged in as ${c.user.tag}`);

    await getUsers();
    await collectReactions();
    // do something every 1 minute
    setInterval(async function() {
        await collectReactions();
        postReactionsToChannel();
        console.log('done');
    }, 1000*60*1); // time is in milliseconds. 1000 ms * 60 sec * 15 min
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


//#region Modal testing
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'ping') {
		// Create the modal
		const modal = new ModalBuilder()
			.setCustomId('matchup')
			.setTitle('Create Matchup');

		// Add components to modal

		// Create the text input components
		const teamName1 = new TextInputBuilder()
			.setCustomId('teamName1')
			.setLabel("Team 1 Name")
			.setStyle(TextInputStyle.Short);

        // Create the text input components
		const teamEmoji1 = new TextInputBuilder()
            .setCustomId('teamEmoji1')
            .setLabel("Team 1 Emoji")
            .setStyle(TextInputStyle.Short);

        const teamName2 = new TextInputBuilder()
            .setCustomId('teamName2')
            .setLabel("Team 2 Name")
            .setStyle(TextInputStyle.Short);
        
        const teamEmoji2 = new TextInputBuilder()
            .setCustomId('teamEmoji2')
            .setLabel("Team 2 Emoji")
            .setStyle(TextInputStyle.Short);

        let team1Players = [];
        for (let i = 0; i < 5; i++) {
            const team1Player = new TextInputBuilder()
                .setCustomId(`team1Player${i}`)
                .setLabel(`Team 1 Player ${i+1}`)
                .setStyle(TextInputStyle.Short);
            team1Players.push(team1Player);
        }

        let team2Players = [];
        for (let i = 0; i < 5; i++) {
            const team2Player = new TextInputBuilder()
                .setCustomId(`team2Player${i}`)
                .setLabel(`Team 2 Player ${i+1}`)
                .setStyle(TextInputStyle.Short);
            team2Players.push(team2Player);
        }


		// // An action row only holds one text input,
		// // so you need one action row per text input.
		const actionRow1 = new ActionRowBuilder().addComponents(teamName1);
		const actionRow2 = new ActionRowBuilder().addComponents(teamEmoji1);
        const actionRow3 = new ActionRowBuilder().addComponents(teamName2);
        const actionRow4 = new ActionRowBuilder().addComponents(teamEmoji2);

        modal.addComponents(
            actionRow1,
            actionRow2,
            new ActionRowBuilder().addComponents(team1Players[0]),
            new ActionRowBuilder().addComponents(team1Players[1]),
            new ActionRowBuilder().addComponents(team1Players[2])
        );

        modal.addComponents(
            actionRow3,
            actionRow4
        )   

		// Show the modal to the user
		await interaction.showModal(modal);
	}
});
//#endregion

function buildMatchupMessage(team1, team2, team1Emoji, team2Emoji) {
    let text = `${team1Emoji} **${team1}** vs **${team2}** ${team2Emoji}\n`;
    return text;
}

let lastMatchupMessages = [];
let lastTeam1Emoji = '';
let lastTeam2Emoji = '';

// read configurations in matchup-config channel
client.on(Events.MessageCreate, async message => {

    console.log('message received')

    if (message.author.bot) return; // ignore bot messages

    if (message.channel.id == matchUpsId) {
        console.log('matchups channel')
        collectReactions();
    }

    if (message.channel.id !== matchUpConfigId) return;


    try {
        let matchUpConfig = JSON.parse(message.content);
        let team1Emoji = matchUpConfig.team1.emoji;
        let team2Emoji = matchUpConfig.team2.emoji;
        let team1 = matchUpConfig.team1;
        let team2 = matchUpConfig.team2;

        let text = buildMatchupMessage(team1.name, team2.name, team1Emoji, team2Emoji);
        lastMatchupMessages.push(text);
        let matchupMessage = await client.channels.cache.get(matchUpConfigId).send(text);
        await matchupMessage.react(team1Emoji);
        await matchupMessage.react(team2Emoji);

        for (let i = 0; i < 5; i++) {
            let text = buildMatchupMessage(team1[`player${i+1}`], team2[`player${i+1}`], team1Emoji, team2Emoji);
            let matchupMessage = await client.channels.cache.get(matchUpConfigId).send(text);
            await matchupMessage.react(team1Emoji);
            await matchupMessage.react(team2Emoji);
            lastMatchupMessages.push(text);
        }
        
        lastTeam1Emoji = team1Emoji;
        lastTeam2Emoji = team2Emoji;

        // write file
        fs.writeFile('./data/lastMatchupMessages.json', JSON.stringify({
            lastMatchupMessages: lastMatchupMessages,
            lastTeam1Emoji: lastTeam1Emoji,
            lastTeam2Emoji: lastTeam2Emoji
        }), (err) => {
            console.log(err)
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

async function getReactedUsers(msg, channelID, messageID, emoji) {
    let cacheChannel = msg.guild.channels.cache.get(channelID);
    // console.log(cacheChannel)
    let users = [];
    if(cacheChannel){
        await cacheChannel.messages.fetch(messageID).then(async reactionMessage => {
           await reactionMessage.reactions.resolve(emoji).users.fetch().then(userList => {
                users = userList
                .filter((user) => !user.bot)
                .map((user) => user.username)
            });
        });
    }
    return users;
}

async function processReactionEvent(reaction) {
    let users = await getReactedUsers(reaction.message, reaction.message.channel.id, reaction.message.id, reaction.emoji.name)

    await fs.readFile('./data/reactionMap.json', 'utf8', async (err, data) => {
        if (err){
            console.log(err);
            // this is bad and should be handled
            // TODO
            return;
        } else {
            let reactionMap;
            try {
                reactionMap = JSON.parse(data, reviver);
            } catch {
                return;
            }
            // try to find the message as a teamMessageId
            let reactionMapItem = reactionMap.get(reaction.message.id);
            if (reactionMapItem) {
                if (reaction.emoji.name == reactionMapItem.team1Emoji) {
                    reactionMapItem.team1Votes = users;
                } else {
                    reactionMapItem.team2Votes = users;
                }
            } else {
                // try to find the message as a matchupMessageId
                for (let [key, value] of reactionMap) {
                    let matchupMessage = value;
                    for (let message of matchupMessage.matchupMessages) {
                        if (message.messageId == reaction.message.id) {
                            if (reaction.emoji.name == message.player1Emoji) {
                                message.player1Votes = users;
                            } else {
                                message.player2Votes = users;
                            }
                        }
                    }
                }
            }

            let reactionMapString = JSON.stringify(reactionMap, replacer);
            await fs.writeFile('./data/reactionMap.json', reactionMapString, (err) => {
                if (err) throw err;
                console.log('Data written to file');
            });

        }
    });
}

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


function postReactionsToChannel() {
    fs.readFile('./data/reactionMap.json', 'utf8', async (err, data) => {
        if (err) {
            return;
        }

        if (data == null) {
            return;
        }
        let reactionMap;
        try {
            reactionMap = JSON.parse(data, reviver);
        } catch {
            return;
        }

        let text = "```"

        for (let [key, value] of reactionMap) {
            let matchupMessage = value;
            text += matchupMessage.teamMessage + "\n";
            let team1Votes = "";
            for (let vote of matchupMessage.team1Votes) {
                team1Votes += `${vote}, `;
            }
            team1Votes = team1Votes.substring(0, team1Votes.length - 2);
            let team2Votes = "";
            for (let vote of matchupMessage.team2Votes) {
                team2Votes += `${vote}, `;
            }
            team2Votes = team2Votes.substring(0, team2Votes.length - 2);

            text += `${matchupMessage.team1} Votes: ${team1Votes}\n`;
            text += `${matchupMessage.team2} Votes: ${team2Votes}\n`;
            text += "\n";
            for (let message of matchupMessage.matchupMessages) {
                text += message.message + "\n";
                let player1Votes = "";
                for (let vote of message.player1Votes) {
                    player1Votes += `${vote}, `;
                }
                player1Votes = player1Votes.substring(0, player1Votes.length - 2);
                let player2Votes = "";
                for (let vote of message.player2Votes) {
                    player2Votes += `${vote}, `;
                }
                player2Votes = player2Votes.substring(0, player2Votes.length - 2);
                text += `${message.player1} Votes: ${player1Votes}\n`;
                text += `${message.player2} Votes: ${player2Votes}\n`;
                text += "\n";
            }
        }


        text += "```"

        let channel = client.channels.cache.get(reactionsId);
        await channel.messages.fetch({ limit: 1 }).then(async messages => {
            if (messages.size == 0) {
                await channel.send(text);
                return;
            }
            let messageArray = Array.from(messages.values());
            await messageArray[0].edit(text);
        });
    });
}

// Log in to Discord with your client's token
client.login(token);