const { SlashCommandBuilder } = require('@discordjs/builders');
const { getReactionMap, getMatchups, getMatchupsChannelId } = require('./../../modules/database.module.js');
const { getScores } = require('../../modules/functions.module.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weekly-report')
        .setDescription('Generates a weekly report')
        .addIntegerOption(option =>
            option.setName('week')
                .setDescription('The week number')
                .setRequired(true)),
    async execute(interaction) {
        const weekNumber = interaction.options.getInteger('week');
        // Your code to generate the weekly report goes here
        await interaction.reply(`Generating report for week ${weekNumber}...`);

        let reactionMap = await getReactionMap(interaction.guild);
        let matchupResults = await getMatchups(interaction.guild);
        let matchups = reactionMap.get(`${weekNumber}`);
        let underdogs = [];
        let topScorers = [];
        let worstScorers = [];


        for (let matchup of matchups) {
            for (let playerMatchup of matchup.matchupMessages) {
                let player1Votes = playerMatchup.player1Votes.length;
                let player2Votes = playerMatchup.player2Votes.length;
                let winner = matchupResults.get(playerMatchup.id).winner;
                let underdogScore;
                if (winner == 1) {
                    underdogScore = player2Votes - player1Votes;
                } else {
                    underdogScore = player1Votes - player2Votes;
                }
                if (underdogScore < 1) {
                    continue;
                }

                underdogs.push({
                    winner: winner,
                    player1: playerMatchup.player1,
                    player2: playerMatchup.player2,
                    player1Votes: player1Votes,
                    player2Votes: player2Votes,
                    underdogScore: underdogScore,
                    message: playerMatchup.message,
                    player1Emoji: playerMatchup.player1Emoji,
                    player2Emoji: playerMatchup.player2Emoji
                });
            }
        }

        let topUnderdogs = [];
        if (underdogs.length > 0) {

            // sore underdogs by highest underdog score
            underdogs.sort((a, b) => {
                return b.underdogScore - a.underdogScore;
            });

            // get all underdogs with the highest underdog score
            let highestUnderdogScore = underdogs[0].underdogScore;
            for (let underdog of underdogs) {
                if (underdog.underdogScore == highestUnderdogScore) {
                    topUnderdogs.push(underdog);
                }
            }
        }

        let scoreMap = await getScores(interaction.guild, weekNumber);

        if (scoreMap.size > 0) {
            let scoreValues = [];
            for (let [key, value] of scoreMap) {
                scoreValues.push({
                    userId: key,
                    lastWeekCorrect: value.lastWeekCorrect,
                    lastWeekIncorrect: value.lastWeekIncorrect
                });
            }
            scoreValues.sort((a, b) => {
                let bScore = b.lastWeekCorrect - b.lastWeekIncorrect;
                let aScore = a.lastWeekCorrect - a.lastWeekIncorrect;
                return bScore - aScore;
            });

            let topScore = scoreValues[0].lastWeekCorrect - scoreValues[0].lastWeekIncorrect;
            for (let score of scoreValues) {
                let scoreValue = score.lastWeekCorrect - score.lastWeekIncorrect;
                if (scoreValue == topScore) {
                    topScorers.push(score);
                }
            }

            let worstScore = scoreValues[scoreValues.length - 1].lastWeekCorrect - scoreValues[scoreValues.length - 1].lastWeekIncorrect;
            for (let score of scoreValues) {
                let scoreValue = score.lastWeekCorrect - score.lastWeekIncorrect;
                if (scoreValue == worstScore) {
                    worstScorers.push(score);
                }
            }
        }

        topScorersInline = topScorers.length > 1;
        worstScorersInline = worstScorers.length > 1;
        topUnderdogsInline = topUnderdogs.length > 1;
        

        const embed = {
            title: `Week ${weekNumber} Report`,
            fields: [
                ...topScorers.map(scorer => {
                    return {
                        name: `💪 Top Picker `,
                        value: `<@${scorer.userId}>
                        Score: ${scorer.lastWeekCorrect - scorer.lastWeekIncorrect}
                        Correct Picks: ${scorer.lastWeekCorrect}
                        Incorrect Picks: ${scorer.lastWeekIncorrect}
                        \u200B`,
                        inline: topScorersInline
                    }
                }),
                ...worstScorers.map(scorer => {
                    return {
                        name: `💩 Worst Picker `,
                        value: `<@${scorer.userId}>
                        Score: ${scorer.lastWeekCorrect - scorer.lastWeekIncorrect}
                        Correct Picks: ${scorer.lastWeekCorrect}
                        Incorrect Picks: ${scorer.lastWeekIncorrect}
                        \u200B`,
                        inline: worstScorersInline
                    }
                }),

                ...topUnderdogs.map((underdog, i) => {
                    let winner = underdog.winner == 1 ? underdog.player1 : underdog.player2;
                    let loser = underdog.winner == 1 ? underdog.player2 : underdog.player1;
                    let winnerVotes = underdog.winner == 1 ? underdog.player1Votes : underdog.player2Votes;
                    let loserVotes = underdog.winner == 1 ? underdog.player2Votes : underdog.player1Votes;
                    return {
                        name: `${i == 0 ? '😲 Biggest Upset': '\u200B'}`,
                        value: `${underdog.message}
                        Winner: ${winner}
                        ${winnerVotes} votes for ${winner}
                        ${loserVotes} votes for ${loser}`,
                        inline: topUnderdogsInline
                    }
                })
            ]
        }

        // for (let scorer of topScorers) {
        //     let user = await interaction.guild.members.fetch(scorer.userId);
        //     embed.addField(`Top Picker`, `<@${user.name}> with a score of ${scorer.lastWeekCorrect} - ${scorer.lastWeekIncorrect}\n
        //         ${scorer.lastWeekCorrect} correct picks\n
        //         ${scorer.lastWeekIncorrect} incorrect picks`);
        // }

        // for (let scorer of worstScorers) {
        //     let user = await interaction.guild.members.fetch(scorer.userId);
        //     embed.addField(`Worst Picker`, `<@${user.name}> with a score of ${scorer.lastWeekCorrect} - ${scorer.lastWeekIncorrect}\n
        //         ${scorer.lastWeekCorrect} correct picks\n
        //         ${scorer.lastWeekIncorrect} incorrect picks`);
        // }

        // for (let underdog of topUnderdogs) {
        //     let winner = underdog.winner == 1 ? underdog.player1 : underdog.player2;
        //     let loser = underdog.winner == 1 ? underdog.player2 : underdog.player1;
        //     let winnerVotes = underdog.winner == 1 ? underdog.player1Votes : underdog.player2Votes;
        //     let loserVotes = underdog.winner == 1 ? underdog.player2Votes : underdog.player1Votes;
        //     embed.addField(`Biggest Upset`, `${underdog.message} winner: ${winner}\n
        //         ${winnerVotes} votes for ${winner}\n
        //         ${loserVotes} votes for ${loser}`);
        // }

        let matchupsChannelId = await getMatchupsChannelId(interaction.guild);
        let matchupsChannel = await interaction.client.channels.cache.get(matchupsChannelId);

        // await matchupsChannel.send({ embeds: [embed]});
    }
};
