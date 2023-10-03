const { SlashCommandBuilder } = require('discord.js');
const { writeScoresToLeaderboard, getScores } = require('../../modules/functions.module');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('refresh-leaderboard')
		.setDescription('Refresh Leaderboard'),
	async execute(interaction) {
		await interaction.reply('Refreshing leaderboard...');
        let scoresMap = await getScores();
        await writeScoresToLeaderboard(interaction.client, scoresMap);
        await interaction.channel.send('Leaderboard refreshed!');
	},
};