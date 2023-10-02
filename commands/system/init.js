const { SlashCommandBuilder } = require('discord.js');
const { getObjectFromFile, writeObjectToFile, updateSetting } = require('./../../modules/functions.module.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('init')
		.setDescription('Initialize Team Tour Bot'),
	async execute(interaction) {
		await interaction.reply('Initializing...');
        let reactionMap = await getObjectFromFile('./data/reactionMap.json');
        let matchups = await getObjectFromFile('./data/matchups.json');
        let settings = await getObjectFromFile('./data/settings.json');
        if (matchups != null) {
            interaction.channel.send('Matchups already exist. Skipping...');
        } else {
            writeObjectToFile('./data/matchups.json', new Map());
        }
        if (reactionMap != null) {
            interaction.channel.send('Reaction Map already exists. Skipping...');
        } else {
            writeObjectToFile('./data/reactionMap.json', new Map());
        }
        if (settings != null) {
            interaction.channel.send('Settings already exist. Skipping...');
        } else {
            writeObjectToFile('./data/settings.json', {});
        }
        interaction.channel.send('Initialization complete.');
	},
};