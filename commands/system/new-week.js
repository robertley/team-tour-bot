const { SlashCommandBuilder } = require('discord.js');
const { updateSetting } = require('./../../modules/functions.module.js');

const { getWeeks, setWeeks, getMatchupsChannelId } = require('../../modules/database.module.js');

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
        let weeks = await getWeeks(interaction.guild);
        if (weeks == null) weeks = [];
        let weekText = interaction.options.getString('custom-divider-text') ?? `Week ${weeks.length + 1}`;
        weeks.push({
            weekNumber: weeks.length + 1,
            finalized: false
        });
        // let divider =  "══════    **_" + weekText + "_**    ══════";
        let divider = "══════════════════\n**_"+ weekText +"_**\n══════════════════";
        await setWeeks(interaction.guild, weeks);
        await updateSetting('weeks', weeks, interaction.client, interaction.guild);
        await interaction.channel.send('New week created: ' + weeks.length)
        await interaction.client.channels.cache.get(await getMatchupsChannelId(interaction.guild)).send(divider);
	},
};