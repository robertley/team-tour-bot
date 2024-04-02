const { SlashCommandBuilder, ChannelType, ButtonBuilder,ActionRowBuilder, PermissionFlagsBits, ButtonStyle } = require('discord.js');
const { getReactionMap } = require("../../modules/database.module");
const { createPickemMatchupChannel } = require("../../modules/functions.module");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('create-matchup-channel')
		.setDescription('Create Matchup Channel for matchup. Used when channel is not created automatically.')
        .addStringOption(option =>
            option.setName('matchup-id')
                .setDescription('The ID of the matchup.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('week')
                .setDescription('The eeek.')
                .setRequired(true)),
	async execute(interaction) {
        let matchupId = interaction.options.getString('matchup-id');
        let week = interaction.options.getString('week');
        let matchups = await getReactionMap(interaction.guild);
        if (!matchups.has(week)) {
            return interaction.reply('Week not found.');
        }
        let weeklyMatchups = matchups.get(week);
        // console.log('weeklyMatchups', weeklyMatchups)
        // console.log('matchupId', matchupId)
        let matchup = weeklyMatchups.find(matchup => matchup.id == matchupId);
        if (matchup === undefined) {
            return interaction.reply('Matchup not found.');
        }

        createPickemMatchupChannel(interaction.client, interaction.guild, matchup, week);
    }
}