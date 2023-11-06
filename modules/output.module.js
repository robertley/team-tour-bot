const { getMatchups, getReactionMap } = require("./database.module");

module.exports.getPlayerVotes = async function getPlayerVotes(guild, user, week, emoji=null) {
    let matchupMessages = [];
    let matchupsMap = await getMatchups(guild);
    let reactionMap = await getReactionMap(guild);
    let reactions = reactionMap.get(week + '');
    if (reactions == null) {
        return 'Invalid week.';
    }
    if (emoji != null) {
        reactions = reactions.filter(reaction => reaction.team1Emoji == emoji || reaction.team2Emoji == emoji);
        if (reactions.length == 0) {
            return 'Invalid emoji.';
        }
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
            voted += winner == vote ? ' ✅' : ' ❌';
        }
        message += `Voted: ${voted}\n`;

        matchupMessages.push(message);

        for (let playerReaction of reaction.matchupMessages) {
            let message = `${playerReaction.message}\n`;
            let vote = 0;
            let voted1 = false;
            let voted2 = false;
            if (playerReaction.player1Votes.includes(user.id)) {
                voted1 = true;
                vote = 1;
            }
            if (playerReaction.player2Votes.includes(user.id)) {
                voted2 = true;
                vote = 2;
            }
            let voted = '';
            if (voted1 && voted2) {
                voted = 'Both'
            } else {
                let winner = matchupsMap.get(playerReaction.id).winner;

                if (vote != 0) {
                    voted = playerReaction[`player${vote}`];
                }
                if (winner != 0 && vote != 0) {
                    voted += winner == vote ? ' ✅' : ' ❌';
                }
            }

            message += `Voted: ${voted}\n`;

            matchupMessages.push(message);
        }
    }

    return matchupMessages;
};

module.exports.createMessageArray = async function createMessageArray(message) {
    let resp = [];
    for(let i = 0; i < message.length; i += 2000) {
        const toSend = message.substring(i, Math.min(message.length, i + 2000));
        resp.push(toSend);
    }
    return resp;
}