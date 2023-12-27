const { SlashCommandBuilder } = require('discord.js');
const { getLeaderboardString, getScores } = require('../../modules/functions.module');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('get-leaderboard')
		.setDescription('See leaderboard from a starting and end position.')
        .addNumberOption(option =>
            option.setName('start')
                .setDescription('First position to see.')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('end')
                .setDescription('Last position to see.')
                .setRequired(true)),
	async execute(interaction) {
        let start = interaction.options.getNumber('start');
        let end = interaction.options.getNumber('end');
        if (start >= end) {
            return interaction.reply({ content: 'Start position must be less than end position.', ephemeral: true });
        }
        let scoresMap = await getScores(interaction.guild);

        let leaderboardString = await getLeaderboardString(interaction.client, scoresMap, start, end);

        let embed = {
            title: `Leaderboard from ${start} to ${end}`,
            description: leaderboardString,
            timestamp: new Date(),
        }

        interaction.reply({ embeds: [embed] });
    }
}