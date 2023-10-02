const { SlashCommandBuilder } = require('discord.js');
const { getObjectFromFile, writeObjectToFile, updateSetting } = require('./../../modules/functions.module.js');
const { matchUpsId } = require('./../../config.json');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('new-week')
		.setDescription('New week for Team Tour')
        .addStringOption(option => 
            option.setName('custom-divider-text')
                .setDescription('custom text for the matchups divider')
                .setRequired(false)),
	async execute(interaction) {
		await interaction.reply('Creating new Team Tour Week...');
        let weeks = await getObjectFromFile('./data/weeks.json');
        if (weeks == null) weeks = [];
        let weekText = interaction.options.getString('custom-divider-text') ?? `Week ${weeks.length + 1}`;
        weeks.push({
            weekNumber: weeks.length + 1,
            finalized: false
        });
        await writeObjectToFile('./data/weeks.json', weeks);
        await updateSetting('weeks', weeks, interaction.client);
        await interaction.channel.send('New week created: ' + weeks.length)
        await interaction.client.channels.cache.get(matchUpsId).send('════════════    **_' + weekText + '_**    ════════════');
	},
};