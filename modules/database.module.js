const { ChannelType } = require('discord.js');
const fs = require('node:fs');

exports.initNewServer = async function initNewServer (guild) {
    const directory = `./data/${guild.id}`;
    try {
        if (!fs.existsSync(directory)) {
          fs.mkdirSync(directory);
        }
    } catch (err) {
        console.error(err);
    }
    await module.exports.initFiles(guild);
    await createDefaultChannels(guild);
}

// TODO: default permissions
createDefaultChannels = async function createDefaultChannels (guild) {
    let category = await guild.channels.create({ name: 'pickems', type: ChannelType.GuildCategory });
    let console = await guild.channels.create({ name: 'pickems-console', type: ChannelType.GuildText, parent: category });
    let matchups = await guild.channels.create({ name: 'matchups', type: ChannelType.GuildText, parent: category });
    let leaderboard = await guild.channels.create({ name: 'leaderboard', type: ChannelType.GuildText, parent: category });
    let settings = await guild.channels.create({ name: 'settings', type: ChannelType.GuildText, parent: category });
    let pickemsMatchupCategory = await guild.channels.create({ name: 'pickems-matchups', type: ChannelType.GuildCategory });
    let pickemsMatchupArchiveCategory = await guild.channels.create({ name: 'pickems-matchups-archive', type: ChannelType.GuildCategory });

    // init settings
    let settingsObject = {
        weeks: [],
        guildId: guild.id,
        matchupsChannelId: matchups.id,
        leaderboardChannelId: leaderboard.id,
        consoleChannelId: console.id,
        settingsChannelId: settings.id,
        pickemsMatchupCategoryId: pickemsMatchupCategory.id,
        pickemsMatchupArchiveCategoryId: pickemsMatchupArchiveCategory.id,
    }

    module.exports.setSettings(guild, settingsObject);
}

exports.initFiles = async function initFiles (guild) {
    const directory = `./data/${guild.id}`;
    const reactionMapFile = `${directory}/reactionMap.json`;
    const matchupsFile = `${directory}/matchups.json`;
    const settingsFile = `${directory}/settings.json`;
    const lastMatchupMessagesFile = `${directory}/lastMatchupMessages.json`;
    const weeksFile = `${directory}/weeks.json`;
    try {
        if (!fs.existsSync(reactionMapFile)) {
          module.exports.setReactionMap(guild, new Map());
        }
        if (!fs.existsSync(matchupsFile)) {
          module.exports.setMatchups(guild, new Map());
        }
        if (!fs.existsSync(settingsFile)) {
          module.exports.setSettings(guild, {});
        }
        if (!fs.existsSync(lastMatchupMessagesFile)) {
          module.exports.setLastMatchupMessage(guild, {});
        }
        if (!fs.existsSync(weeksFile)) {
          module.exports.setWeeks(guild, []);
        }
    } catch (err) {
        console.error(err);
    }
}

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


// CRUD
exports.getLastMatchupMessage = async function getLastMatchupMessage(guild) {
    let lastMatchupMessages = await module.exports.getObjectFromFile(`./data/${guild.id}/lastMatchupMessages.json`);
    return lastMatchupMessages;
}

exports.getMatchups = async function getMatchups(guild) {
    let matchups = await module.exports.getObjectFromFile(`./data/${guild.id}/matchups.json`);
    return matchups;
}

exports.getReactionMap = async function getReactionMap(guild) {
    let reactionMap = await module.exports.getObjectFromFile(`./data/${guild.id}/reactionMap.json`);
    return reactionMap;
}

exports.getSettings = async function getSettings(guild) {
    let settings = await module.exports.getObjectFromFile(`./data/${guild.id}/settings.json`);
    return settings;
}

exports.getWeeks = async function getWeeks(guild) {
    let weeks = await module.exports.getObjectFromFile(`./data/${guild.id}/weeks.json`);
    return weeks;
}

exports.setLastMatchupMessage = async function setLastMatchupMessage(guild, lastMatchupMessages) {
    await module.exports.writeObjectToFile(`./data/${guild.id}/lastMatchupMessages.json`, lastMatchupMessages);
}

exports.setMatchups = async function setMatchups(guild, matchups) {
    await module.exports.writeObjectToFile(`./data/${guild.id}/matchups.json`, matchups);
}

exports.setReactionMap = async function setReactionMap(guild, reactionMap) {
    await module.exports.writeObjectToFile(`./data/${guild.id}/reactionMap.json`, reactionMap);
}

exports.setSettings = async function setSettings(guild, settings) {
    await module.exports.writeObjectToFile(`./data/${guild.id}/settings.json`, settings);
}

exports.setWeeks = async function setWeeks(guild, weeks) {
    await module.exports.writeObjectToFile(`./data/${guild.id}/weeks.json`, weeks);
}

// config IDs
exports.getMatchupsChannelId = async function getMatchupsChannelId(guild) {
    let settings = await module.exports.getSettings(guild);
    console.log(settings)
    return settings.matchupsChannelId;
}

exports.getLeaderboardChannelId = async function getLeaderboardChannelId(guild) {
    let settings = await module.exports.getSettings(guild);
    return settings.leaderboardChannelId;
}

exports.getConsoleChannelId = async function getConsoleChannelId(guild) {
    let settings = await module.exports.getSettings(guild);
    return settings.consoleChannelId;
}

exports.getSettingsChannelId = async function getSettingsChannelId(guild) {
    let settings = await module.exports.getSettings(guild);
    return settings.settingsChannelId;
}

exports.getPickemsMatchupCategoryId = async function getPickemsMatchupCategoryId(guild) {
    let settings = await module.exports.getSettings(guild);
    return settings.pickemsMatchupCategoryId;
}

