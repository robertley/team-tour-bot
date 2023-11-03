// const { SlashCommandBuilder } = require('discord.js');
// const { collectReactions, prettyJson, finalizeWeek } = require('./../../modules/functions.module.js'); 
// const { getObjectFromFile, writeObjectToFile, getWeeks, getMatchupsChannelId } = require('./../../modules/database.module.js');
// const fs = require('node:fs');

// module.exports = {
// 	data: new SlashCommandBuilder()
// 		.setName('finalize-reactions-test')
// 		.setDescription('Finalize reactions test. See if this works')
// 		.addStringOption(option => 
// 			option.setName('week')
// 				.setDescription('The week to collect reactions for.')
// 				.setRequired(true)),
// 	async execute(interaction) {
// 		try {
// 			interaction.reply({ content: 'Collecting reactions...', ephemeral: true });
// 			let week = interaction.options.getString('week');
// 			let resp = await collectReactions(interaction.client, interaction.guild, week, true);
// 			console.log('resp', resp)
// 			let respPartial = [];
// 			let response = ""
// 			for (let item of resp) {
// 				// respPartial.push({
// 				// 	teamMessage: item.teamMessage,
// 				// 	team1Votes: item.team1Votes,
// 				// 	team2Votes: item.team2Votes,
// 				// 	matchups: item.matchupMessages.map(message => {
// 				// 		return {
// 				// 			player1: message.player1,
// 				// 			player2: message.player2,
// 				// 			player1Votes: message.player1Votes,
// 				// 			player2Votes: message.player2Votes
// 				// 		}
// 				// 	})
// 				// })
// 				response += item.teamMessage + "\n";
// 				response += `${item.team1} Votes: ${item.team1Votes}\n`;
// 				response += `${item.team2} Votes: ${item.team2Votes}\n`;
// 				for (let message of item.matchupMessages) {
// 					response += `${message.player1} Votes: ${message.player1Votes}\n`;
// 					response += `${message.player2} Votes: ${message.player2Votes}\n`;
// 				}
// 			}
// 			// resp = prettyJson(JSON.stringify(respPartial));
// 			// let parts = resp.match(/[\s\S]{1,2000}/g) || [];
// 			// for (let part of parts) {
// 			// 	await interaction.channel.send({ content: part });
// 			// }
// 			await interaction.channel.send({ content: response });

// 		} catch (error) {
// 			console.error(error);
// 			return interaction.channel.send({ content: 'There was an error while collecting the reactions.'});
// 		}
// 	},
// };
