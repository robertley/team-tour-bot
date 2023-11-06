const { SlashCommandBuilder } = require('discord.js');
const { matchUpsId } = require('./../../config.json');
const { getObjectFromFile, writeObjectToFile, getWeeks, getReactionMap, setReactionMap, getMatchupsChannelId, getSettings, setSettings } = require('./../../modules/database.module.js');
const { updateSetting } = require('../../modules/functions.module');
const { getPlayerVotes, createMessageArray } = require('../../modules/output.module');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('my-votes')
		.setDescription('See your votes for a week.')
        .addStringOption(option =>
            option.setName('week')
                .setDescription('The week you want to see your votes for.')
                .setRequired(true)),
	async execute(interaction) {
        interaction.reply({ content: 'Sending your votes to your DMs...', ephemeral: true })
        // dm user who used command
        let user = interaction.user;
        let week = interaction.options.getString('week');

        let voteResp = await getPlayerVotes(interaction.guild, user, week);
        let matchupMessages = [];
        if (typeof voteResp == 'string') {
            return interaction.reply({ content: voteResp, ephemeral: true });
        } else {
            matchupMessages = voteResp;
        }
        let resp = '--\n';
        resp += `Week ${week} Votes\n`;
        for (let item of matchupMessages) {
            resp += item;
        }
        messageArray = await createMessageArray(resp);
        console.log(messageArray)
        for (let message of messageArray) {
            await user.send(message);
        }
    }
}