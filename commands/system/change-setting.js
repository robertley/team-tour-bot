const { SlashCommandBuilder } = require('discord.js');
const { matchUpsId } = require('./../../config.json');
const { getObjectFromFile, writeObjectToFile, getWeeks, getReactionMap, setReactionMap, getMatchupsChannelId, getSettings, setSettings } = require('./../../modules/database.module.js');
const { updateSetting } = require('../../modules/functions.module');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('change-setting')
		.setDescription('Change a setting value.')
        .addStringOption(option =>
            option.setName('field')
                .setDescription('The field you want to edit.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('value')
                .setDescription('The value to set the field to.')
                .setRequired(true)),
	async execute(interaction) {
        let field = interaction.options.getString('field');
        let value = interaction.options.getString('value');
        let settings = await getSettings(interaction.guild);
        let validFields = Object.keys(settings);
        if (!validFields.includes(field)) {
            return interaction.channel.send('Invalid field.');
        }
        await updateSetting(field, value, interaction.client, interaction.guild);
        await interaction.reply(`Setting ${field} updated.`);
    }
}