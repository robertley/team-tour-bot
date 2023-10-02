const { SlashCommandBuilder } = require('discord.js');
const { updateSetting, getObjectFromFile } = require('../../modules/functions.module');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('refresh-settings')
		.setDescription('Refresh Bot Settings'),
	async execute(interaction) {
		await interaction.reply('Refreshing settings...');
        let weeks = await getObjectFromFile('./data/weeks.json');
        await updateSetting('weeks', weeks, interaction.client);
        await interaction.channel.send('Settings refreshed!');
	},
};