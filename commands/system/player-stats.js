const { SlashCommandBuilder } = require('@discordjs/builders');
const { getReactionMap, getMatchups } = require('./../../modules/database.module.js');
const { getScores } = require('../../modules/functions.module.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('player-stats')
        .setDescription("Get the Pick'em stats for a player")
        .addUserOption(option =>
            option.setName('player')
                .setDescription('The player you want to get stats for.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('week')
                .setDescription('The week you want to see pick stats for.')
                .setRequired(false)),
    async execute(interaction) {
        let user = interaction.options.getUser('player');

        let scores = await getScores(interaction.guild);
        let score = scores.get(user.id);
        let week = interaction.options.getString('week');

        let matchupMessages = [];
        if (week != null) {
            let matchupsMap = await getMatchups(interaction.guild);
            let reactionMap = await getReactionMap(interaction.guild);
            let reactions = reactionMap.get(week + '');
            if (reactions == null) {
                return interaction.reply('Invalid week.');
            }
            for (let reaction of reactions) {
                let message = `${reaction.teamMessage}\n`;
                let vote = 0;
                if (reaction.team1Votes.includes(user.id)) {
                    vote = 1;
                } else if (reaction.team2Votes.includes(user.id)) {
                    vote = 2;
                }
                let winner = matchupsMap.get(reaction.id).winner;
                let voted = '';
                if (vote != 0) {
                    voted = reaction[`team${vote}`];
                }
                if (winner != 0) {
                    voted += winner == voted ? ' ✅' : ' ❌';
                }
                message += `Voted: ${voted}\n`;

                matchupMessages.push(message);

                for (let playerReaction of reaction.matchupMessages) {
                    let message = `${playerReaction.message}\n`;
                    let vote = 0;
                    if (playerReaction.player1Votes.includes(user.id)) {
                        vote = 1;
                    } else if (playerReaction.player2Votes.includes(user.id)) {
                        vote = 2;
                    }
                    let winner = matchupsMap.get(playerReaction.id).winner;
                    let voted = '';
                    if (vote != 0) {
                        voted = playerReaction[`player${vote}`];
                    }
                    if (winner != 0 && vote != 0) {
                        voted += winner == vote ? ' ✅' : ' ❌';
                    }
                    message += `Voted: ${voted}\n`;

                    matchupMessages.push(message);
                }
            }
        }

        // let embed = {
        //     title: `${user.username}'s Pick'em Stats`,
        //     fields: [
        //         {
        //             name: 'Total Score',
        //             value: `${score.correct - score.incorrect}`
        //         },
        //         {
        //             name: 'Correct',
        //             value: `${score.correct}`
        //         },
        //         {
        //             name: 'Incorrect',
        //             value: `${score.incorrect}`
        //         }
        //     ]
        // }

        let leaderboard = [];
        for (let [key, value] of scores) {
            let scoreObject = {
                user: key,
                score: `${value.correct - value.incorrect}`,
            }
            leaderboard.push(scoreObject);
        }
        
        leaderboard.sort((a, b) => {
            return b.score - a.score
        });

        console.log(leaderboard)

        let prevRank = 1;
        let prevScore = 0;
        let rank = 1;
        for (let i = 0; i < leaderboard.length; i++) {
            rank = i+1;
            if (leaderboard[i].score == prevScore) {
                rank = prevRank;
            }
            prevRank = rank;
            if (leaderboard[i].user == user.id) {
                break;
            }
            prevScore = leaderboard[i].score;
        }

        let reply = `**${user.username}'s Pick'em Stats**\n`;
        reply += `**Rank**: ${rank}\n`;
        reply += `**Total Score**: ${score.correct - score.incorrect}\n`;
        reply += `**Correct**: ${score.correct}\n`;
        reply += `**Incorrect**: ${score.incorrect}\n\n`;

        if (week != null) {
            let value = `**Week ${week} Picks**\n`;
            for (let message of matchupMessages) {
                value += message;
            }
            // embed.fields.push({
            //     name: `Last Week Picks`,
            //     value: value
            // })
            reply += value;
        }

        interaction.reply(reply);
    }
}