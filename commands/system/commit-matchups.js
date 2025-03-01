const { SlashCommandBuilder, ChannelType, ButtonBuilder,ActionRowBuilder, PermissionFlagsBits, ButtonStyle } = require('discord.js');
const { createMatchupObjects, setMatchupWinner, createPickemMatchupChannel } = require('../../modules/functions.module');
const { getObjectFromFile, writeObjectToFile, getReactionMap, getLastMatchupMessage, setReactionMap, setLastMatchupMessage, getMatchupsChannelId, getConsoleChannelId, getPickemsMatchupCategoryId } = require('./../../modules/database.module.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('commit-matchups')
		.setDescription('Send the last created matchups in the config channel to the matchups channel.'),
	async execute(interaction) {
        let matchupsChannelId = await getMatchupsChannelId(interaction.guild);
        let consoleChannelId = await getConsoleChannelId(interaction.guild);
        let matchupsChannel = await interaction.client.channels.cache.get(matchupsChannelId);
        let matchupConfigChannel = await interaction.client.channels.cache.get(consoleChannelId);
        try {
            interaction.reply('Committing matchups...');
            let reactionMap = await getReactionMap(interaction.guild);
            let matchupData = await getLastMatchupMessage(interaction.guild);

            console.log('matchupData', matchupData)

            // check if matchups channel is empty object
            if (Object.keys(matchupData).length === 0) {
                return matchupConfigChannel.send('No matchups to commit.');
            }

            // if last message in the matchups channel is a matchup, add a divider
            let lastMessage = await matchupsChannel.messages.fetch({ limit: 1 });
            // check if lastMessage has a reaction
            if (Array.from(lastMessage.first().components).length > 0) {
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
                matchupMessages: [],
                // finalized: false
            }

            matchupObjects.push({
                id: id,
                winner: 0
            })

            matchupArray.push(reactionMapItem);

            for (let i in matchupData.lastMatchupMessages) {

                let message = matchupData.lastMatchupMessages[i];

                let messageContentArray = message.split("**");
                let player1 = messageContentArray[1];
                let player2 = messageContentArray[3];

                if (i == 0) {
                    let messageSent = await matchupsChannel.send({
                        content: message,
                        components: [
                            createButtonRow(matchupData.lastTeam1Emoji, matchupData.lastTeam2Emoji, id, matchupData.week)
                        ]
                    });
                    reactionMapItem.teamMessage = messageSent.content;
                    reactionMapItem.teamMessageId = messageSent.id;
                    reactionMapItem.team1 = player1;
                    reactionMapItem.team2 = player2;
                    reactionMapItem.team1Emoji = matchupData.lastTeam1Emoji ?? matchupData.lastTeam1Emoji;
                    reactionMapItem.team2Emoji = matchupData.lastTeam2Emoji ?? matchupData.lastTeam2Emoji;
                } else {
                    let id = Date.now();
                    let messageSent = await matchupsChannel.send({
                        content: message,
                        components: [
                            createButtonRow(matchupData.lastTeam1Emoji, matchupData.lastTeam2Emoji, id, matchupData.week)
                        ]
                    });
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

            await createMatchupObjects(matchupObjects, interaction.guild);
            await setReactionMap(interaction.guild, reactionMap);
            await setLastMatchupMessage(interaction.guild, {});
            await createPickemMatchupChannel(interaction.client, interaction.guild, reactionMapItem, matchupData.week);
            matchupConfigChannel.send('Matchups committed.');
        } catch (error) {
            console.log(error);
            matchupConfigChannel.send('Error committing matchups.');
        }
	}
};

function createButtonRow(emoji1, emoji2, id, week) {
    let button1 = new ButtonBuilder({
        emoji: emoji1,
        customId: `vote-${id}-1-${week}`,
        label: '0',
        style: ButtonStyle.Secondary
    });
    let button2 = new ButtonBuilder({
        emoji: emoji2,
        customId: `vote-${id}-2-${week}`,
        label: '0',
        style: ButtonStyle.Secondary
    });

    return new ActionRowBuilder().addComponents(button1, button2);
}