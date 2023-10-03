const { SlashCommandBuilder } = require('discord.js');
const { updateSetting, getObjectFromFile, writeObjectToFile } = require('../../modules/functions.module');
const { matchUpsId } = require('./../../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('delete-team-matchup')
		.setDescription('Delete team matchup and all associated data.')
        .addStringOption(option =>
            option.setName('matchup-id')
                .setDescription('The ID of the matchup.')
                .setRequired(true)),
	async execute(interaction) {
		await interaction.reply('Deleting matchup...');
        let matchupId = interaction.options.getString('matchup-id');
        let weeks = await getObjectFromFile('./data/weeks.json');
        let activeWeeks = weeks.filter(week => !week.finalized);
        let reactionMap = await getObjectFromFile('./data/reactionMap.json');
        let matchupItem;
        let matchupArrayWithItem;
        let weekNumber;
        for (let week of activeWeeks) {
            let matchupArray = reactionMap.get(`${week.weekNumber}`);
            for (let matchup of matchupArray) {
                if (matchup.id == matchupId) {
                    matchupItem = matchup;
                    matchupArrayWithItem = matchupArray
                    weekNumber = week.weekNumber;
                    break;
                }
            }
        }
        if (!matchupItem) {
            return interaction.channel.send('Matchup not found, or Matchup is in a finalized week.');
        }
        let messageIds = [matchupItem.teamMessageId];
        let matchupIds = [matchupItem.id];
        for (let message of matchupItem.matchupMessages) {
            messageIds.push(message.messageId);
            matchupIds.push(message.matchupId);
        }
        

        // remove matchupItem from matchupArray 
        matchupArrayWithItem = matchupArrayWithItem.filter(matchup => matchup.id != matchupId);
        reactionMap.set(`${weekNumber}`, matchupArrayWithItem);
        await writeObjectToFile('./data/reactionMap.json', reactionMap);

        // remove all matchups from matchups.json
        let matchups = await getObjectFromFile('./data/matchups.json');
        for (let id of matchupIds) {
            matchups.delete(id);
        }
        await writeObjectToFile('./data/matchups.json', matchups);

        // remove all messages from the #matchups channel
        let matchupsChannel = await interaction.client.channels.cache.get(matchUpsId);
        for (let id of messageIds) {
            await matchupsChannel.messages.fetch(id).then(message => message.delete());
        }
        await interaction.channel.send('Matchup deleted.');
	},
};