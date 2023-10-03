const fs = require('node:fs');
const { matchUpsId, matchUpConfigId, settingsId, leaderboardId } = require('./../config.json');

exports.getObjectFromFile = async function getObjectFromFile(filePath) {
    return new Promise(async (resolve, reject) => {
        await fs.readFile(filePath, 'utf8', async (err, data) => {
            if (err){
                reject(err);
            } else {
                if (data == '') {
                    resolve(null);
                    return;
                }
                object = JSON.parse(data, module.exports.reviver);
                resolve(object);
            }
        });
    });
}

exports.writeObjectToFile = async function writeObjectToFile(filePath, object) {
    return new Promise(async (resolve, reject) => {
        let objectString = JSON.stringify(object, module.exports.replacer);
        await fs.writeFile(filePath, objectString, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

exports.collectReactions = async function collectReactions(client, week) {
    let matchupsChannel = client.channels.cache.get(matchUpsId);
    await matchupsChannel.messages.fetch({ limit: 100 }).then(async messages => {
        console.log(`Received ${messages.size} messages`);
        let mssgArray = Array.from(messages.values());

        
        let reactionMap = await module.exports.getObjectFromFile('./data/reactionMap.json');
        for (let message of mssgArray) {

            let messageArray = Array.from(message.reactions.cache.values());
            for (let reaction of messageArray) {
                await processReactionEvent(reaction, reactionMap, week);
            }
        }

        // console.log('Collected; Reaction Map:\n')
        // console.log(module.exports.prettyJson(reactionMapString));
        await module.exports.writeObjectToFile('./data/reactionMap.json', reactionMap);
    }).catch(console.error);
}

async function processReactionEvent(reaction, reactionMap, week) {
    let users;
    try {
        users = await getReactedUsers(reaction.message, reaction.message.channel.id, reaction.message.id, reaction.emoji.name, reaction.emoji.id);
    } catch (error) {
        console.log('Error getting reacted users', reaction.message.id, reaction.message.channel.id, reaction.emoji.name, error);
        throw error;
    }

    // console.log(users);

    // try to find the message as a teamMessageId
    let matchupItems = reactionMap.get(week);
    for (let item of matchupItems) {
        if (item.teamMessageId == reaction.message.id) {
            let team1Emoji = item.team1Emoji.substring(item.team1Emoji.indexOf(':') + 1, item.team1Emoji.lastIndexOf(':'));
            if (team1Emoji == '') {
                team1Emoji = item.team1Emoji;
            }
            

            if (reaction.emoji.name == team1Emoji) {
                item.team1Votes = users;
            } else {
                item.team2Votes = users;
            }

            break;
        }
        for (message of item.matchupMessages) {
            if (message.messageId == reaction.message.id) {
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
    // if (reactionMapItem) {
    //     if (reaction.emoji.name == reactionMapItem.team1Emoji) {
    //         reactionMapItem.team1Votes = users;
    //     } else {
    //         reactionMapItem.team2Votes = users;
    //     }
    // } else {
    //     // try to find the message as a matchupMessageId
    //     for (let [key, value] of reactionMap) {
    //         let matchupMessage = value;
    //         for (let message of matchupMessage.matchupMessages) {
    //             if (message.messageId == reaction.message.id) {
    //                 if (reaction.emoji.name == message.player1Emoji) {
    //                     message.player1Votes = users;
    //                 } else {
    //                     message.player2Votes = users;
    //                 }
    //             }
    //         }
    //     }
    // }
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


async function getReactedUsers(msg, channelID, messageID, emoji, customEmojiId) {
    let cacheChannel = msg.guild.channels.cache.get(channelID);
    // console.log(cacheChannel)
    let users = [];
    if(cacheChannel){
        await cacheChannel.messages.fetch(messageID).then(async reactionMessage => {
            // console.log('reactionMessage', reactionMessage)
           await reactionMessage.reactions.resolve(customEmojiId ?? emoji).users.fetch().then(userList => {
                users = userList
                .filter((user) => !user.bot)
                .map((user) => user.id)
            });
        });
    }
    return users;
}
 
exports.prettyJson = function prettyJson(jsonString, map=false) {
    let json = JSON.parse(jsonString);
    return JSON.stringify(json, null, 2);
}

exports.writeToSettingsServer = async function writeToSettingsServer(client) {
    let settings = await module.exports.getObjectFromFile('./data/settings.json');
    let settingsString = JSON.stringify(settings, module.exports.replacer);
    let text= "```" + module.exports.prettyJson(settingsString) + "```";
    let channel = client.channels.cache.get(settingsId);
	await channel.messages.fetch({ limit: 1 }).then(async messages => {
		if (messages.size == 0) {
			await channel.send(text);
			return;
		}
		let messageArray = Array.from(messages.values());
		await messageArray[0].edit(text);
	});
}

exports.updateSetting = async function updateSetting(key, value, client) {
    let settings = await module.exports.getObjectFromFile('./data/settings.json');
    settings[key] = value;
    await module.exports.writeObjectToFile('./data/settings.json', settings);
    await module.exports.writeToSettingsServer(client);
}

exports.finalizeWeek = async function finalizeWeek(week, client) {
    let weeks = await module.exports.getObjectFromFile('./data/weeks.json');
    for (let weekObj of weeks) {
        if (weekObj.weekNumber == week) {
            weekObj.finalized = true;
            break;
        }
    }
    await module.exports.writeObjectToFile('./data/weeks.json', weeks);
    await module.exports.updateSetting('weeks', weeks, client);
}

exports.createMatchupObjects = async function createMatchupObjects(objects) {
    let existingObjects = await module.exports.getObjectFromFile('./data/matchups.json');
    for (let object of objects) {
        existingObjects.set(object.id, object);
    }
    await module.exports.writeObjectToFile('./data/matchups.json', existingObjects);
}

exports.setMatchupWinner = async function setMatchupWinner(id, winner) {
    // console.log('setting winner...', id, winner)
    let matchups = await module.exports.getObjectFromFile('./data/matchups.json');
    let matchup = matchups.get(id);
    matchup.winner = winner;
    await module.exports.writeObjectToFile('./data/matchups.json', matchups);
}

exports.getScores = async function getScores() {
    let matchups = await module.exports.getObjectFromFile('./data/matchups.json');
    let reactionMap = await module.exports.getObjectFromFile('./data/reactionMap.json');
    let scoresMap = new Map();
    let weeks = await module.exports.getObjectFromFile('./data/weeks.json');
    let lastWeek;
    if (weeks) {
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
                    usersCorrect = item.team1Votes;
                    usersIncorrect = item.team2Votes;
                } else {
                    usersCorrect = item.team2Votes;
                    usersIncorrect = item.team1Votes;
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
                        usersCorrect = message.player1Votes;
                        usersIncorrect = message.player2Votes;
                    } else {
                        usersCorrect = message.player2Votes;
                        usersIncorrect = message.player1Votes;
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

exports.writeScoresToLeaderboard = async function writeScoresToLeaderboard(client, scoresMap) {
    let leaderboard = [];
    for (let [key, value] of scoresMap) {
        let user = await client.users.fetch(key);
        let scoreObject = {
            user: user.username,
            correct: `${value.correct}`,
            incorrect: `${value.incorrect}`,
            score: `${value.correct - value.incorrect}`
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
        return b.score - a.score;
    });
    let leaderboardString = '';
    let colLength = [];
    let header = ['Rank', 'User', 'Correct', 'Incorrect', 'Score'];
    for (let i = 0; i < header.length; i++) {
        colLength.push(header[i].length);
    }
    console.log(colLength)
    for (let i = 0; i < leaderboard.length; i++) {
        let scoreObject = leaderboard[i];
        colLength[0] = max(colLength[0], i + 1);
        colLength[1] = max(colLength[1], scoreObject.user.length);
        colLength[2] = max(colLength[2], `${scoreObject.correct}`.length);
        colLength[3] = max(colLength[3], `${scoreObject.incorrect}`.length);
        colLength[4] = max(colLength[4], `${scoreObject.score}`.length);
    }
    leaderboardString = '```'

    leaderboardString += `${header[0]}`.padEnd(colLength[0] + 2, ' ');
    leaderboardString += `${header[1]}`.padEnd(colLength[1] + 2, ' ');
    leaderboardString += `${header[2]}`.padEnd(colLength[2] + 2, ' ');
    leaderboardString += `${header[3]}`.padEnd(colLength[3] + 2, ' ');
    leaderboardString += `${header[4]}`.padEnd(colLength[4] + 2, ' ');
    leaderboardString += '\n';

    console.log(colLength);
    for (let i = 0; i < leaderboard.length; i++) {
        let scoreObject = leaderboard[i];
        leaderboardString += `${i + 1}`.padEnd(colLength[0] + 2, ' ');
        leaderboardString += `${scoreObject.user}`.padEnd(colLength[1] + 2, ' ');
        leaderboardString += `${scoreObject.correct}`.padEnd(colLength[2] + 2, ' ');
        leaderboardString += `${scoreObject.incorrect}`.padEnd(colLength[3] + 2, ' ');
        leaderboardString += `${scoreObject.score}`.padEnd(colLength[4] + 2, ' ');
        leaderboardString += '\n';
    }

    leaderboardString += '```';

    let channel = client.channels.cache.get(leaderboardId);
    await channel.messages.fetch({ limit: 1 }).then(async messages => {
        if (messages.size == 0) {
            await channel.send(leaderboardString);
            return;
        }
        let messageArray = Array.from(messages.values());
        await messageArray[0].edit(leaderboardString);
    });
}

function max(a, b) {
    return Math.max(a, b);
}

exports.validWeek = async function validWeek(week) {
    let weeks = await module.exports.getObjectFromFile('./data/weeks.json');
    for (let weekObj of weeks) {
        if (weekObj.weekNumber == week) {
            return !weekObj.finalized;
        }
    }
    return false;
}