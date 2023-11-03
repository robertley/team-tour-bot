const { ButtonBuilder, SlashCommandBuilder, ActionRowBuilder } = require("@discordjs/builders");
const { getReactionMap, getMatchupsChannelId } = require("../../modules/database.module");
const { ButtonStyle } = require("discord.js");
const { getScores, writeScoresToLeaderboard } = require("../../modules/functions.module");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('finalize-votes')
		.setDescription('Finalize votes for week.')
		.addStringOption(option => 
			option.setName('week')
				.setDescription('The week to collect reactions for.')
				.setRequired(true)),
	async execute(interaction) {
		try {
			interaction.reply({ content: 'Finalizing votes...', ephemeral: true });
			let week = interaction.options.getString('week');
            let reactionMap = await getReactionMap(interaction.guild);
            let reactions = reactionMap.get(week);
            let matchupsChannel = interaction.client.channels.cache.get(await getMatchupsChannelId(interaction.guild));

            for (reactionItem of reactions) {
                if (reactionItem.finalized) {
                    continue;
                }

                await disableMessage(reactionItem.teamMessageId, matchupsChannel);

                for (let matchup of reactionItem.matchupMessages) {
                    await disableMessage(matchup.messageId, matchupsChannel);
                }

                reactionItem.finalized = true;
            }

			let scoresMap = await getScores(interaction.guild);
			await writeScoresToLeaderboard(interaction.client, scoresMap, interaction.guild);
			interaction.channel.send({ content: 'Leaderboard refreshed!'});
			// await postReactionsToChannel();
		} catch (error) {
			console.error(error);
			return interaction.channel.send({ content: 'There was an error while collecting the reactions.'});
		}
	},
};

async function disableMessage(messageId, channel) {
    let message = await channel.messages.fetch(messageId);

    let buttons = message.components[0].components;
    let button1 = buttons[0];
    let button2 = buttons[1];
    // console.log(button1)
    let newButton1 = new ButtonBuilder({
        custom_id: button1.data.custom_id,
        style: ButtonStyle.Secondary,
        label: button1.data.label,
        emoji: button1.data.emoji,
        disabled: true
    });
    console.log(newButton1)
    let newButton2 = new ButtonBuilder({
        custom_id: button2.data.custom_id,
        style: ButtonStyle.Secondary,
        label: button2.data.label,
        emoji: button2.data.emoji,
        disabled: true
    });
    message.edit({
        components: [
            new ActionRowBuilder().addComponents(newButton1, newButton2)
        ]
    })

}
