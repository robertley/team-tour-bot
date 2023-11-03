// const { SlashCommandBuilder } = require('discord.js');
// const { getMatchups } = require('../../modules/database.module');

// module.exports = {
// 	data: new SlashCommandBuilder()
// 		.setName('force-vote')
// 		.setDescription('force a vote for a matchup')
//         .addStringOption(option => 
//             option.setName('week')
//                 .setDescription('The week you want to force a vote for.')
//                 .setRequired(true))
//         .addStringOption(option =>
//             option.setName('player')
//                 .setDescription('The player you want to force a vote for.')
//                 .setRequired(true)),
// 	async execute(interaction) {
// 		await interaction.reply({ content: 'Forcing vote...', ephemeral: true });
//         let week = interaction.options.getString('week')?.trim();
//         let player = interaction.options.getString('player')?.trim();
//         let reactionMap = await getReactionMap(interaction.guild);
//         if (reactions == null) {
//             return interaction.reply({ content: 'Invalid week.', ephemeral: true });
//         }
//         for (let reaction of reactions) {
//             let message = `${reaction.teamMessage}\n`;
//             let vote = 0;
//             if (reaction.team1Votes.includes(player.id)) {
//                 vote = 1;
//             } else if (reaction.team2Votes.includes(player.id)) {
//                 vote = 2;
//             }
//             let winner = matchupsMap.get(reaction.id).winner;
//             let voted = '';
//             if (vote != 0) {
//                 voted = reaction[`team${vote}`];
//             }
//             if (winner != 0) {
//                 voted += winner == vote ? ' ✅' : ' ❌';
//             }
//             message += `Voted: ${voted}\n`;
//             await interaction.channel.send(message);
//         }
// 	},
// };