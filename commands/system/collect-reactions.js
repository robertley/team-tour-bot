const { SlashCommandBuilder } = require('discord.js');
const { collectReactions, prettyJson, finalizeWeek, getScores, writeScoresToLeaderboard } = require('./../../modules/functions.module.js'); 
const { getObjectFromFile, writeObjectToFile, getWeeks, getMatchupsChannelId } = require('./../../modules/database.module.js');
const fs = require('node:fs');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('finalize-reactions')
		.setDescription('Collect reactions. The reactions are finalized and cannot be changed.')
		.addStringOption(option => 
			option.setName('week')
				.setDescription('The week to collect reactions for.')
				.setRequired(true)),
	async execute(interaction) {
		try {
			interaction.reply({ content: 'Collecting reactions...', ephemeral: true });
			let week = interaction.options.getString('week');
			// let storedWeeks = await getWeeks(interaction.guild);
			// let storedWeek = storedWeeks.find(storedWeek => storedWeek.weekNumber == week);
			// if (storedWeek.finalized) {
			// 	return interaction.channel.send({ content: `Week ${week} has been finalized.`});
			// }
			await collectReactions(interaction.client, interaction.guild, week, false);
			// await postReactionsToChannel(interaction.client);
			// await finalizeWeek(week, interaction.client, interaction.guild)
			await interaction.client.channels.cache.get(await getMatchupsChannelId(interaction.guild)).send({ content: `_The above matchups have been finalized. All picks made after the timestamp on this message will not be counted._`});
			interaction.channel.send({ content: `Reactions collected. Week ${week} reactions been finalized.`})
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

// sets off 1000 character limit
async function postReactionsToChannel(client) {
	let reactionMap = await getObjectFromFile('./data/reactionMap.json');

	let text = "```"

	for (let [key, value] of reactionMap) {
		text += `Week ${key}\n`;
		for (let matchupMessage of value) {
			text += matchupMessage.teamMessage + "\n";
			let team1Votes = "";
			for (let vote of matchupMessage.team1Votes) {
				team1Votes += `${vote}, `;
			}
			team1Votes = team1Votes.substring(0, team1Votes.length - 2);
			let team2Votes = "";
			for (let vote of matchupMessage.team2Votes) {
				team2Votes += `${vote}, `;
			}
			team2Votes = team2Votes.substring(0, team2Votes.length - 2);

			text += `${matchupMessage.team1} Votes: ${team1Votes}\n`;
			text += `${matchupMessage.team2} Votes: ${team2Votes}\n`;
			text += "\n";
			for (let message of matchupMessage.matchupMessages) {
				text += message.message + "\n";
				let player1Votes = "";
				for (let vote of message.player1Votes) {
					player1Votes += `${vote}, `;
				}
				player1Votes = player1Votes.substring(0, player1Votes.length - 2);
				let player2Votes = "";
				for (let vote of message.player2Votes) {
					player2Votes += `${vote}, `;
				}
				player2Votes = player2Votes.substring(0, player2Votes.length - 2);
				text += `${message.player1} Votes: ${player1Votes}\n`;
				text += `${message.player2} Votes: ${player2Votes}\n`;
				text += "\n";
			}
		}
	}


	text += "```"

	let channel = client.channels.cache.get(reactionsId);
	await channel.messages.fetch({ limit: 1 }).then(async messages => {
		if (messages.size == 0) {
			await channel.send(text);
			return;
		}
		let messageArray = Array.from(messages.values());
		await messageArray[0].edit(text);
	});
}
