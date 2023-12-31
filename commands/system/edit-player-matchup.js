const { SlashCommandBuilder } = require('discord.js');
const { matchUpsId } = require('./../../config.json');
const { getObjectFromFile, writeObjectToFile, getWeeks, getReactionMap, setReactionMap, getMatchupsChannelId } = require('./../../modules/database.module.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('edit-player-matchup')
		.setDescription('Edit player matchup and all associated data.')
        .addStringOption(option =>
            option.setName('matchup-id')
                .setDescription('The ID of the matchup.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('field')
                .setDescription('The field you want to edit.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('value')
                .setDescription('The value to set the field to.')
                .setRequired(true)),
	async execute(interaction) {
        await interaction.reply('Editing matchup...');
        let matchupId = interaction.options.getString('matchup-id');
        let field = interaction.options.getString('field');
        let value = interaction.options.getString('value');
        let validFields = ['player1', 'player2'];
        if (!validFields.includes(field)) {
            return interaction.channel.send('Invalid field.');
        }
        let weeks = await getWeeks(interaction.guild);
        let activeWeeks = weeks.filter(week => !week.finalized);
        let reactionMap = await getReactionMap(interaction.guild);
        let matchupItem;
        for (let week of activeWeeks) {
            let matchupArray = reactionMap.get(`${week.weekNumber}`);
            for (let matchup of matchupArray) {
                for (let playerMatchup of matchup.matchupMessages) {
                    if (playerMatchup.id == matchupId) {
                        matchupItem = playerMatchup;
                        break;
                    }
                }
            }
        }
        if (!matchupItem) {
            return interaction.channel.send('Matchup not found, or Matchup is in a finalized week.');
        }
        matchupItem[field] = value;
        await setReactionMap(interaction.guild, reactionMap);

        if (field == 'player1' || field == 'player2') {
                // update message in #matchups channel
                let matchupsChannel = await interaction.client.channels.cache.get(await getMatchupsChannelId(interaction.guild));
                let newMessage = `${matchupItem.player1Emoji} **${matchupItem.player1}** vs. **${matchupItem.player2}** ${matchupItem.player2Emoji}`
                await matchupsChannel.messages.fetch(matchupItem.messageId).then(message => message.edit(newMessage));
        }

        await interaction.channel.send(`Matchup ${matchupId} updated.`);
    }
}