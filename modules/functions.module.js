const { ChannelType, PermissionFlagsBits, ButtonBuilder, ActionRowBuilder } = require('discord.js');
const { getReactionMap, setReactionMap, getSettings, setSettings, getWeeks, setWeeks, getMatchups, setMatchups, getLeaderboardChannelId, getMatchupsChannelId, writeToSettingsServer, getPickemsMatchupCategoryId } = require('./database.module.js');
const { badWords } = require('../badwords.json');

exports.collectReactions = async function collectReactions(client, guild, week, test) {
    let matchupsChannel = client.channels.cache.get(await getMatchupsChannelId(guild));
    let resp;
    await matchupsChannel.messages.fetch({ limit: 100 }).then(async messages => {
        console.log(`Received ${messages.size} messages`);
        let mssgArray = Array.from(messages.values());

        let finalizedMatchups = [];
        let reactionMap = await getReactionMap(guild);
        for (let message of mssgArray) {

            let messageArray = Array.from(message.reactions.cache.values());
            for (let reaction of messageArray) {
                finalizedMatchups.push(...await processReactionEvent(reaction, reactionMap, week, message));
            }
        }

        for (let matchup of reactionMap.get(week)) {
            if (finalizedMatchups.includes(matchup.teamMessageId)) {
                matchup.finalized = true;
            }
        }
        if (!test) {
            await setReactionMap(guild, reactionMap);
        } else {
            let weekReactions = reactionMap.get(week);
            console.log('weekReactions', weekReactions);
            for (let matchup of weekReactions) {
                console.log('matchup', matchup);
                matchup.team1Votes = matchup.team1Votes.length;
                matchup.team2Votes = matchup.team2Votes.length;
                for (let message of matchup.matchupMessages) {
                    message.player1Votes = message.player1Votes.length;
                    message.player2Votes = message.player2Votes.length;
                }
            }
            resp = weekReactions;
        }

    }).catch(console.error);
    return resp;
}

async function processReactionEvent(reaction, reactionMap, week, msg) {
    let finalizedMatchups = new Set();
    // try to find the message as a teamMessageId
    let matchupItems = reactionMap.get(week);
    for (let item of matchupItems) {
        if (item.finalized) {
            continue;
        }
        if (item.teamMessageId == reaction.message.id) {
            let users = await getReactedUsers(reaction.emoji.name, reaction.emoji.id, msg);
            let team1Emoji = item.team1Emoji.substring(item.team1Emoji.indexOf(':') + 1, item.team1Emoji.lastIndexOf(':'));
            if (team1Emoji == '') {
                team1Emoji = item.team1Emoji;
            }
            

            if (reaction.emoji.name == team1Emoji) {
                item.team1Votes = users;
            } else {
                item.team2Votes = users;
            }
            finalizedMatchups.add(item.teamMessageId);
            break;
        }
        for (message of item.matchupMessages) {
            if (message.messageId == reaction.message.id) {
                let users = await getReactedUsers(reaction.emoji.name, reaction.emoji.id, msg);
                let player1Emoji = message.player1Emoji.substring(message.player1Emoji.indexOf(':') + 1, message.player1Emoji.lastIndexOf(':')) ?? message.player1Emoji;
                if (player1Emoji == '') {
                    player1Emoji = message.player1Emoji;
                }
                if (reaction.emoji.name == player1Emoji) {
                    message.player1Votes = users;
                } else {
                    message.player2Votes = users;
                }
                break;
            }
        }
    }

    return Array.from(finalizedMatchups);
}

exports.replacer = function replacer(key, value) {
    if(value instanceof Map) {
      return {
        dataType: 'Map',
        value: Array.from(value.entries()), // or with spread: value: [...value]
      };
    } else {
      return value;
    }
}

exports.reviver = function reviver(key, value) {
    if(typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
        return new Map(value.value);
        }
    }
    return value;
}


async function getReactedUsers(emoji, customEmojiId, message) {
    await message.reactions.resolve(customEmojiId ?? emoji).users.fetch().then(userList => {
        users = userList
        .filter((user) => !user.bot)
        .map((user) => user.id)
    });
    return users;
}
 
exports.prettyJson = function prettyJson(jsonString, map=false) {
    let json = JSON.parse(jsonString);
    return JSON.stringify(json, null, 2);
}

exports.updateSetting = async function updateSetting(key, value, client, guild) {
    let settings = await getSettings(guild);
    settings[key] = value;
    await setSettings(guild, settings);
    await writeToSettingsServer(client, guild, settings);
}

exports.finalizeWeek = async function finalizeWeek(week, client, guild) {
    let weeks = await getWeeks(guild);
    for (let weekObj of weeks) {
        if (weekObj.weekNumber == week) {
            weekObj.finalized = true;
            break;
        }
    }
    await setWeeks(guild, weeks);
    await module.exports.updateSetting('weeks', weeks, client, guild);
}

exports.createMatchupObjects = async function createMatchupObjects(objects, guild) {
    let existingObjects = await getMatchups(guild);
    for (let object of objects) {
        existingObjects.set(object.id, object);
    }
    await setMatchups(guild, existingObjects);
}

exports.setMatchupWinner = async function setMatchupWinner(id, winner, guild) {
    console.log(guild)
    // console.log('setting winner...', id, winner)
    let matchups = await getMatchups(guild);
    let matchup = matchups.get(id);
    matchup.winner = winner;
    await setMatchups(guild, matchups);
}

exports.getScores = async function getScores(guild, lastWeek=null) {
    let matchups = await getMatchups(guild);
    let reactionMap = await getReactionMap(guild);
    let scoresMap = new Map();
    let weeks = await getWeeks(guild);
    if (weeks && lastWeek == null) {
        lastWeek = weeks[weeks.length - 1].weekNumber;
    }

    // filter out all matchups that have 0 as the winner value
    let finalizedMatchups = new Map();
    for (let [key, value] of matchups) {
        if (value.winner != 0) {
            finalizedMatchups.set(key, value);
        }
    }

    for (let [week, matchupItems] of reactionMap) {
        let isLastWeek = week == lastWeek;
        for (let item of matchupItems) {
            let teamMatchupId = item.id;
            if (finalizedMatchups.has(teamMatchupId)) {
                let winner = matchups.get(teamMatchupId).winner;
                let usersCorrect;
                let usersIncorrect;
                if (winner == 1) {
                    usersCorrect = new Set(item.team1Votes);
                    usersIncorrect = new Set(item.team2Votes);
                } else {
                    usersCorrect = new Set(item.team2Votes);
                    usersIncorrect = new Set(item.team1Votes);
                }
                let removeUsers = [];
                for (let user of usersCorrect) {
                    if (usersIncorrect.has(user)) {
                        removeUsers.push(user);
                    }
                }
                for (let user of removeUsers) {
                    usersCorrect.delete(user);
                    usersIncorrect.delete(user);
                }
                for (let user of usersCorrect) {
                    addUserScore('correct', user, scoresMap, isLastWeek);
                }
                for (let user of usersIncorrect) {
                    addUserScore('incorrect', user, scoresMap, isLastWeek);
                }
            }
            for (let message of item.matchupMessages) {
                let playerMatchupId = message.id;
                if (finalizedMatchups.has(playerMatchupId)) {
                    let winner = matchups.get(playerMatchupId).winner;
                    let usersCorrect;
                    let usersIncorrect;
                    if (winner == 1) {
                        usersCorrect = new Set(message.player1Votes);
                        usersIncorrect = new Set(message.player2Votes);
                    } else {
                        usersCorrect = new Set(message.player2Votes);
                        usersIncorrect = new Set(message.player1Votes);
                    }
                    let removeUsers = [];
                    for (let user of usersCorrect) {
                        if (usersIncorrect.has(user)) {
                            removeUsers.push(user);
                        }
                    }
                    for (let user of removeUsers) {
                        usersCorrect.delete(user);
                        usersIncorrect.delete(user);
                    }
                    for (let user of usersCorrect) {
                        addUserScore('correct', user, scoresMap, isLastWeek);
                    }
                    for (let user of usersIncorrect) {
                        addUserScore('incorrect', user, scoresMap, isLastWeek);
                    }
                }
            }

        }
    }
    return scoresMap;
}

function addUserScore(score, user, scoresMap, lastWeek) {
    let scoreObject;
    if (scoresMap.has(user)) {
        scoreObject = scoresMap.get(user);
    } else {
        scoreObject = {
            correct: 0,
            incorrect: 0,
            lastWeekCorrect: 0,
            lastWeekIncorrect: 0
        }
        scoresMap.set(user, scoreObject);
    }
    if (score == 'correct') {
        scoreObject.correct++;
    } else {
        scoreObject.incorrect++;
    }
    if (lastWeek) {
        if (score == 'correct') {
            scoreObject.lastWeekCorrect++;
        } else {
            scoreObject.lastWeekIncorrect++;
        }
    }
}

exports.writeScoresToLeaderboard = async function writeScoresToLeaderboard(client, scoresMap, guild) {

    let leaderboardString = await module.exports.getLeaderboardString(client, scoresMap, 1, 50);

    let embed = {
        title: `Pick'ems Leaderboard`,
        description: leaderboardString
    }

    let channel = client.channels.cache.get(await getLeaderboardChannelId(guild));
    await channel.messages.fetch({ limit: 1 }).then(async messages => {
        if (messages.size == 0) {
            await channel.send({ embeds: [embed]});
            return;
        }
        let messageArray = Array.from(messages.values());
        await messageArray[0].edit({ embeds: [embed]});
    });
}

exports.getLeaderboardString = async function getLeaderboardString(client, scoresMap, start, end) {
    let leaderboard = [];

    for (let [key, value] of scoresMap) {
        let user = await client.users.fetch(key);
        let scoreObject = {
            user: user.username,
            correct: `${value.correct}`,
            incorrect: `${value.incorrect}`,
            score: `${value.correct - value.incorrect}`,
            scoreVal: value.correct - value.incorrect
        }
        if (value.lastWeekCorrect > 0) {
            scoreObject.correct += ` (${value.lastWeekCorrect < 1 ? '-' : '+'}${value.lastWeekCorrect})`;
        }
        if (value.lastWeekIncorrect > 0) {
            scoreObject.incorrect += ` (${value.lastWeekIncorrect < 1 ? '-' : '+'}${value.lastWeekIncorrect})`;
        }
        if (Math.abs(value.lastWeekCorrect - value.lastWeekIncorrect) > 0) {
            scoreObject.score += ` (${value.lastWeekCorrect - value.lastWeekIncorrect < 1 ? '-' : '+'}${Math.abs(value.lastWeekCorrect - value.lastWeekIncorrect)})`;
        }
        leaderboard.push(scoreObject);
    }
    
    leaderboard.sort((a, b) => {
        return b.scoreVal - a.scoreVal
    });
    let leaderboardString = '';
    let colLength = [];
    let header = ['Rank', 'Correct', 'Incorr', 'Score', 'User'];
    // header = ['', '', '', '', ''] 
    let leaderboardPositions = Math.min(end - start + 1, leaderboard.length)

    for (let i = 0; i < header.length; i++) {
        colLength.push(header[i].length);
    }
    let embedWidth = 53;
    let userNameMax = 99;
    for (let i = start - 1; i < leaderboardPositions; i++) {
        let scoreObject = leaderboard[i];
        colLength[0] = max(colLength[0], `${i + 1}`.length);
        colLength[1] = max(colLength[1], `${scoreObject.correct}`.length);
        colLength[2] = max(colLength[2], `${scoreObject.incorrect}`.length);
        colLength[3] = max(colLength[3], `${scoreObject.score}`.length);
        colLength[4] = max(colLength[4], min(scoreObject.user.length, userNameMax));
    }
    leaderboardString = '```'
    let pad = ' '
    leaderboardString += `${header[0]}`.padEnd(colLength[0] + 2, pad);
    leaderboardString += `${header[1]}`.padEnd(colLength[1] + 2, pad);
    leaderboardString += `${header[2]}`.padEnd(colLength[2] + 2, pad);
    leaderboardString += `${header[3]}`.padEnd(colLength[3] + 2, pad);
    leaderboardString += `${header[4]}`.padEnd(colLength[4] + 2, pad);
    leaderboardString += '\n';

    // leaderboardString += '123456789012345678901234567890123456789012345678901234567890\n'
    // leaderboardString += '-----------------------------------------------------\n'
    // leaderboardString += '12345678901234567890123456789012345678901234567890123\n'

    let prevScore = 0;
    let prevRank = 0;
    for (let i = start - 1; i < leaderboardPositions; i++) {
        let scoreObject = leaderboard[i];
        let rank = i + 1;
        if (scoreObject.scoreVal == prevScore) {
            rank = prevRank;
        }
        prevRank = rank;
        let user = scoreObject.user;
        if (user.length > userNameMax) {
            user = user.slice(0,userNameMax - 3) + '...';
        }
        leaderboardString += `${rank}`.padEnd(colLength[0] + 2, pad);
        leaderboardString += `${scoreObject.correct}`.padEnd(colLength[1] + 2, pad);
        leaderboardString += `${scoreObject.incorrect}`.padEnd(colLength[2] + 2, pad);
        leaderboardString += `${scoreObject.score}`.padEnd(colLength[3] + 2, pad);
        leaderboardString += `${user}`
        leaderboardString += '\n';
        prevScore = scoreObject.scoreVal;
    }

    leaderboardString += '```\n';

    leaderboardString += `${leaderboard.length} players total`

    return leaderboardString;
}

exports.createPickemMatchupChannel = async function createPickemMatchupChannel(client, guild, reactionMapItem, week) {
    console.log(reactionMapItem)
    let guildId = guild.id;
    let pickemId = await getPickemsMatchupCategoryId(guild);
    let parent = await client.guilds.cache.get(guildId).channels.cache.get(pickemId);
    let role = await guild.roles.cache.find(role => role.name === "Pick'em Admin");
    let channelName = `${week} ${reactionMapItem.team1} vs ${reactionMapItem.team2}`;
    // trim channel name to 100 characters
    if (channelName.length > 100) {
        channelName = channelName.substring(0, 100);
    }

    // filter bad words
    for (let word of badWords) {
        if (channelName.toLowerCase().includes(word)) {
            channelName = channelName.replace(word, '_'.repeat(word.length));
        }
    }
        

    let channel = await client.guilds.cache.get(guildId).channels.create({
        name: channelName,
        type: ChannelType.GUILD_TEXT,
        parent: parent,
        permissionOverwrites: [
            {
                id: guildId,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: role.id,
                allow: [PermissionFlagsBits.ViewChannel]
            }
        ],
    });

    let buttonLabel1 = reactionMapItem.team1;
    let buttonLabel2 = reactionMapItem.team2;
    // trim to 80 chars
    if (buttonLabel1.length > 80) {
        buttonLabel1 = buttonLabel1.substring(0, 80);
    }
    if (buttonLabel2.length > 80) {
        buttonLabel2 = buttonLabel2.substring(0, 80);
    }

    const team1 = new ButtonBuilder()
        .setStyle('Primary')
        .setLabel(buttonLabel1)
        .setCustomId('winner-' + reactionMapItem.id + '-1');
    const team2 = new ButtonBuilder()
        .setStyle('Primary')
        .setLabel(buttonLabel2)
        .setCustomId('winner-' + reactionMapItem.id + '-2');
    const noWinner = new ButtonBuilder()
        .setStyle('Primary')
        .setLabel('No Winner')
        .setCustomId('winner-' + reactionMapItem.id + '-0');

    const row = new ActionRowBuilder()
        .addComponents(team1, team2, noWinner);

    // unicode for white large square emoji
    let emoji = '\u{2B1C}';

    let content = `Matchup ID: ${reactionMapItem.id}\n`
    content += `**${reactionMapItem.team1}** :red_square: vs **${reactionMapItem.team2}** :green_square: - Winner ` + emoji;
    await channel.send({
        content: content,
        components: [row]
    });

    for (let matchup of reactionMapItem.matchupMessages) {
        let buttonLabel1 = matchup.player1;
        let buttonLabel2 = matchup.player2;
        // trim to 80 chars
        if (buttonLabel1.length > 80) {
            buttonLabel1 = buttonLabel1.substring(0, 80);
        }
        if (buttonLabel2.length > 80) {
            buttonLabel2 = buttonLabel2.substring(0, 80);
        }
        const player1 = new ButtonBuilder()
            .setStyle('Primary')
            .setLabel(buttonLabel1)
            .setCustomId('winner-' + matchup.id + '-1');
        const player2 = new ButtonBuilder()
            .setStyle('Primary')
            .setLabel(buttonLabel2)
            .setCustomId('winner-' + matchup.id + '-2');
        const noWinner = new ButtonBuilder()
            .setStyle('Primary')
            .setLabel('No Winner')
            .setCustomId('winner-' + matchup.id + '-0');
        
        const row = new ActionRowBuilder()
            .addComponents(player1, player2, noWinner);

        let content = `Matchup ID: ${matchup.id}\n`
        content += `**${matchup.player1}** :red_square: vs **${matchup.player2}** :green_square: - Winner ` + emoji;
        await channel.send({
            content: content,
            components: [row]
        });
    }


}

function max(a, b) {
    return Math.max(a, b);
}

function min(a, b) {
    return Math.min(a, b);
}

exports.validWeek = async function validWeek(week, guild) {
    let weeks = await getWeeks(guild);
    for (let weekObj of weeks) {
        if (weekObj.weekNumber == week) {
            return !weekObj.finalized;
        }
    }
    return false;
}