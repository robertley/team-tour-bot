const { SlashCommandBuilder } = require('discord.js');
const { getObjectFromFile, writeObjectToFile, getReactionMap, getMatchups, getSettings, setMatchups, setReactionMap, setSettings } = require('./../../modules/database.module.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('init')
		.setDescription('Initialize Team Tour Bot'),
	async execute(interaction) {
		await interaction.reply('Initializing...');
        let reactionMap = await getReactionMap(interaction.guild);
        let matchups = await getMatchups(interaction.guild);
        let settings = await getSettings(interaction.guild);
        if (matchups != null) {
            interaction.channel.send('Matchups already exist. Skipping...');
        } else {
            await setMatchups(interaction.guild, new Map());
        }
        if (reactionMap != null) {
            interaction.channel.send('Reaction Map already exists. Skipping...');
        } else {
            await setReactionMap(interaction.guild, new Map());
        }
        if (settings != null) {
            interaction.channel.send('Settings already exist. Skipping...');
        } else {
            await setSettings(interaction.guild, new Map());
        }
        interaction.channel.send('Initialization complete.');
	},
};