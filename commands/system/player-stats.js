const { SlashCommandBuilder } = require('@discordjs/builders');
const { getReactionMap, getMatchups } = require('./../../modules/database.module.js');
const { getScores } = require('../../modules/functions.module.js');
const { EmbedBuilder } = require('discord.js');
const { getPlayerVotes } = require('../../modules/output.module.js');

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
                .setRequired(false))
        .addStringOption(option =>
            option.setName('emoji')
                .setDescription('Emoji of a team in the matchup you want to check your pick stats for.')
                .setRequired(false)),
    async execute(interaction) {
        let user = interaction.options.getUser('player');
        let week = interaction.options.getString('week')?.trim();
        let scores = await getScores(interaction.guild, week);
        let score = scores.get(user.id);
        let emoji = interaction.options.getString('emoji')?.trim();
        // if (week != null && emoji == null) {
        //     return interaction.reply({ content: 'You must specify an emoji if you specify a week.', ephemeral: true });
        // }
        if (week == null && emoji != null) {
            return interaction.reply({ content: 'You must specify a week if you specify an emoji.', ephemeral: true });
        }

        let matchupMessages = [];
        if (week != null && emoji != null) {
            let voteResp = await getPlayerVotes(interaction.guild, user, week, emoji);
            if (typeof voteResp == 'string') {
                return interaction.reply({ content: voteResp, ephemeral: true });
            } else {
                matchupMessages = voteResp;
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
            reply += `**Week ${week} Picks**\n`;
            reply += `**Total Score**: ${score[`lastWeekCorrect`] - score[`lastWeekIncorrect`]}\n`;
            reply += `**Correct**: ${score[`lastWeekCorrect`]}\n`;
            reply += `**Incorrect**: ${score[`lastWeekIncorrect`]}\n\n`;

            if (emoji != null) {
                let value = '';
                for (let message of matchupMessages) {
                    value += message;
                }
                reply += value;
            }

        }

        interaction.reply(reply);
    }
}