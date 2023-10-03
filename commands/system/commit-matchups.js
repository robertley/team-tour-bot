const { SlashCommandBuilder, ChannelType, ButtonBuilder,ActionRowBuilder } = require('discord.js');
const { matchUpsId, matchUpConfigId, guildId, pickemId } = require('./../../config.json');
const { getObjectFromFile, writeObjectToFile, createMatchupObjects, setMatchupWinner } = require('../../modules/functions.module');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('commit-matchups')
		.setDescription('Send the last created matchups in the config channel to the matchups channel.'),
	async execute(interaction) {
        let matchupsChannel = await interaction.client.channels.cache.get(matchUpsId);
        let matchupConfigChannel = await interaction.client.channels.cache.get(matchUpConfigId);
        try {
            interaction.reply('Committing matchups...');
            let reactionMap = await getObjectFromFile('./data/reactionMap.json');
            let matchupData = await getObjectFromFile('./data/lastMatchupMessages.json');

            // check if matchups channel is empty object
            if (Object.keys(matchupData).length === 0) {
                return matchupConfigChannel.send('No matchups to commit.');
            }

            // if last message in the matchups channel is a matchup, add a divider
            let lastMessage = await matchupsChannel.messages.fetch({ limit: 1 });
            // check if lastMessage has a reaction
            if (lastMessage.first().reactions.cache.size > 0) {
                await matchupsChannel.send('----------------------------------');
            }

            let matchupArray = [];
            if (reactionMap.has(matchupData.week)) {
                matchupArray = reactionMap.get(matchupData.week);
            } else {
                reactionMap.set(matchupData.week, matchupArray);
            }

            let matchupObjects = [];

            console.log('reactionMap', reactionMap);
            let id = Date.now();

            let reactionMapItem = {
                id: id,
                teamMessageId: '',
                teamMessage: '',
                team1: '',
                team2: '',
                team1Emoji: '',
                team2Emoji: '',
                team1Votes: [],
                team2Votes: [],
                matchupMessages: []
            }

            matchupObjects.push({
                id: id,
                winner: 0
            })

            matchupArray.push(reactionMapItem);

            for (let i in matchupData.lastMatchupMessages) {

                let message = matchupData.lastMatchupMessages[i];
                let messageSent = await matchupsChannel.send(message);
                await messageSent.react(matchupData.lastTeam1Emoji);
                await messageSent.react(matchupData.lastTeam2Emoji);

                let messageContentArray = messageSent.content.split("**");
                let player1 = messageContentArray[1];
                let player2 = messageContentArray[3];

                if (i == 0) {
                    reactionMapItem.teamMessage = messageSent.content;
                    reactionMapItem.teamMessageId = messageSent.id;
                    reactionMapItem.team1 = player1;
                    reactionMapItem.team2 = player2;
                    reactionMapItem.team1Emoji = matchupData.lastTeam1Emoji ?? matchupData.lastTeam1Emoji;
                    reactionMapItem.team2Emoji = matchupData.lastTeam2Emoji ?? matchupData.lastTeam2Emoji;
                } else {
                    let id = Date.now();
                    reactionMapItem.matchupMessages.push({
                        id: id,
                        messageId: messageSent.id,
                        message: messageSent.content,
                        player1: player1,
                        player2: player2,
                        player1Emoji: matchupData.lastTeam1Emoji.name ?? matchupData.lastTeam1Emoji,
                        player2Emoji: matchupData.lastTeam2Emoji.name ?? matchupData.lastTeam2Emoji,
                        player1Votes: [],
                        player2Votes: []
                    });

                    matchupObjects.push({
                        id: id,
                        winner: 0
                    })
                }
    
            }

            await createMatchupObjects(matchupObjects);
            writeObjectToFile('./data/reactionMap.json', reactionMap);
            writeObjectToFile('./data/lastMatchupMessages.json', {});
            await createPickemMatchupChannels(interaction.client, reactionMapItem, matchupData.week);
            matchupConfigChannel.send('Matchups committed.');
        } catch (error) {
            console.log(error);
            matchupConfigChannel.send('Error committing matchups.');
        }
	}
};

async function createPickemMatchupChannels(client, reactionMapItem, week) {
    let parent = await client.guilds.cache.get(guildId).channels.cache.get(pickemId);
    let channel = await client.guilds.cache.get(guildId).channels.create({
        name: `${week} ${reactionMapItem.team1} vs ${reactionMapItem.team2}`,
        type: ChannelType.GUILD_TEXT,
        parent: parent
    });

    const team1 = new ButtonBuilder()
        .setStyle('Primary')
        .setLabel(reactionMapItem.team1)
        .setCustomId(reactionMapItem.id + '-1');
    const team2 = new ButtonBuilder()
        .setStyle('Primary')
        .setLabel(reactionMapItem.team2)
        .setCustomId(reactionMapItem.id + '-2');
    const noWinner = new ButtonBuilder()
        .setStyle('Primary')
        .setLabel('No Winner')
        .setCustomId(reactionMapItem.id + '-0');

    const row = new ActionRowBuilder()
        .addComponents(team1, team2, noWinner);

    // unicode for white large square emoji
    let emoji = '\u{2B1C}';

    let content = `Matchup ID: ${reactionMapItem.id}\n`
    content += `**${reactionMapItem.team1}** :red_square: vs **${reactionMapItem.team2}** :green_square: - Winner ` + emoji;
    await channel.send({
        content: content,
        components: [row]
    });

    for (let matchup of reactionMapItem.matchupMessages) {
        const player1 = new ButtonBuilder()
            .setStyle('Primary')
            .setLabel(matchup.player1)
            .setCustomId(matchup.id + '-1');
        const player2 = new ButtonBuilder()
            .setStyle('Primary')
            .setLabel(matchup.player2)
            .setCustomId(matchup.id + '-2');
        const noWinner = new ButtonBuilder()
            .setStyle('Primary')
            .setLabel('No Winner')
            .setCustomId(matchup.id + '-0');
        
        const row = new ActionRowBuilder()
            .addComponents(player1, player2, noWinner);

        let content = `Matchup ID: ${matchup.id}\n`
        content += `**${matchup.player1}** :red_square: vs **${matchup.player2}** :green_square: - Winner ` + emoji;
        await channel.send({
            content: content,
            components: [row]
        });
    }


}