const { SlashCommandBuilder } = require('discord.js');
const fs = require('node:fs');
const { matchUpsId, matchUpConfigId } = require('./../../config.json');

function replacer(key, value) {
    if(value instanceof Map) {
      return {
        dataType: 'Map',
        value: Array.from(value.entries()), // or with spread: value: [...value]
      };
    } else {
      return value;
    }
}

function reviver(key, value) {
    if(typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
        return new Map(value.value);
        }
    }
return value;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('commit-matchups')
		.setDescription('Send the last created matchups in the config channel to the matchups channel.'),
	async execute(interaction) {
        let matchupsChannel = await interaction.client.channels.cache.get(matchUpsId);
        let matchupConfigChannel = await interaction.client.channels.cache.get(matchUpConfigId);
        try {
            interaction.reply('Committing matchups...');
            let matchupData;
            fs.readFile('./data/lastMatchupMessages.json', 'utf8', async (err, data) => {
                if (err){
                    console.log(err);
                } else {
                    matchupData = JSON.parse(data); //now it an object
                    console.log('data read', matchupData);

                    fs.readFile('./data/reactionMap.json', 'utf8', async (err, data) => {
                        if (err){
                            console.log(err);
                        }

                        let reactionMap;
                        try {
                            reactionMap = JSON.parse(data, reviver);
                        } catch (error) {
                            reactionMap = new Map();
                            console.log('error parsing reactionMap', error)
                        }
                        console.log('reactionMap', reactionMap);

                        let reactionMapItem = {
                            teamMessageId: '',
                            teamMessage: '',
                            team1: '',
                            team2: '',
                            team1Emoji: '',
                            team2Emoji: '',
                            team1Votes: [],
                            team2Votes: [],
                            matchupMessages: []
                        }

                        for (let i in matchupData.lastMatchupMessages) {
                            let message = matchupData.lastMatchupMessages[i];
                            let messageSent = await matchupsChannel.send(message);
                            await messageSent.react(matchupData.lastTeam1Emoji);
                            await messageSent.react(matchupData.lastTeam2Emoji);

                            let messageContentArray = messageSent.content.split("**");
                            let player1 = messageContentArray[1];
                            let player2 = messageContentArray[3];

                            if (i == 0) {
                                reactionMapItem.teamMessage = messageSent.content;
                                reactionMapItem.teamMessageId = messageSent.id;
                                reactionMapItem.team1 = player1;
                                reactionMapItem.team2 = player2;
                                reactionMapItem.team1Emoji = matchupData.lastTeam1Emoji;
                                reactionMapItem.team2Emoji = matchupData.lastTeam2Emoji;
                            } else {
                                reactionMapItem.matchupMessages.push({
                                    messageId: messageSent.id,
                                    message: messageSent.content,
                                    player1: player1,
                                    player2: player2,
                                    player1Emoji: matchupData.lastTeam1Emoji,
                                    player2Emoji: matchupData.lastTeam2Emoji,
                                    player1Votes: [],
                                    player2Votes: []
                                });
                            }
                        }

                        reactionMap.set(reactionMapItem.teamMessageId, reactionMapItem);

                        let reactionMapString = JSON.stringify(reactionMap, replacer);
                        fs.writeFile('./data/reactionMap.json', reactionMapString, (err) => {
                            if (err) throw err;
                            console.log('Data written to file');
                        });
                        
                    })
                }
            });


            matchupConfigChannel.send('Matchups committed.');
        } catch (error) {
            console.log(error);
            matchupConfigChannel.send('Error committing matchups.');
        }
	}
};