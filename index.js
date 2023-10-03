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
const { writeToSettingsServer, writeObjectToFile, setMatchupWinner, getScores, prettyJson, replacer, writeScoresToLeaderboard, validWeek } = require('./modules/functions.module.js');
const { verify } = require('node:crypto');
const { get } = require('node:http');


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
    await writeToSettingsServer(client);
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


//#region Modal testing
client.on(Events.InteractionCreate, async interaction => {
    
    if (interaction.isButton()) {
        buttonHandler(interaction);
        return;
    }

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

    // if (message.channel.id == matchUpsId) {
    //     console.log('matchups channel')
    //     collectReactions();
    // }

    if (message.channel.id !== matchUpConfigId) return;


    try {
        let matchUpConfig = JSON.parse(message.content);
        let week = matchUpConfig.week;
        if (!(await validWeek(week))) {
            message.reply('The week number is invalid.');
            return;
        }
        let team1Emoji = matchUpConfig.team1.emoji;
        let team2Emoji = matchUpConfig.team2.emoji;
        let team1 = matchUpConfig.team1;
        let team2 = matchUpConfig.team2;
        lastMatchupMessages = [];

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

        await writeObjectToFile('./data/lastMatchupMessages.json', {
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

async function buttonHandler(interaction) {
    console.log('button clicked')
    let customId = interaction.customId;
    let customIdArray = customId.split('-');
    let team = customIdArray[1];
    let matchupId = customIdArray[0];

    await setMatchupWinner(+matchupId, team);

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

    let scoresMap = await getScores();
    writeScoresToLeaderboard(client, scoresMap);
    let scoresString = JSON.stringify(scoresMap, replacer, 2);
    console.log(scoresString);
}

// Log in to Discord with your client's token
client.login(token);