const { SlashCommandBuilder } = require('discord.js');
const { getObjectFromFile, writeObjectToFile, getWeeks } = require('./../../modules/database.module.js');
const { updateSetting } = require('./../../modules/functions.module.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('refresh-settings')
		.setDescription('Refresh Bot Settings'),
	async execute(interaction) {
		await interaction.reply('Refreshing settings...');
        let weeks = getWeeks(interaction.guild);
        await updateSetting('weeks', weeks, interaction.client, interaction.guild);
        await interaction.channel.send('Settings refreshed!');
	},
};