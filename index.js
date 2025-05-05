
const { Client,
        GatewayIntentBits,
        Partials,
        ActionRowBuilder,
        ButtonBuilder,
        ButtonStyle,
        SlashCommandBuilder,
        Routes,
        UserFlags
         } = require("discord.js");
const { REST } = require('@discordjs/rest');
const {
    TOKEN, 
    BOT_CLIENT_ID,
    DISCORD_GUILD,
    SPLITTER_MESSAGE_ID,
    CHANNEL_ID,
    LEFT_VC,
    RIGHT_VC,
    COMBINED_VC
} = require('./config.json')

const bot = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions],
	partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

const commands = [
	new SlashCommandBuilder().setName('vcsplit').setDescription('hey'),
]

const rest = new REST({ version: '10' }).setToken(TOKEN);

rest.put(Routes.applicationGuildCommands(BOT_CLIENT_ID, DISCORD_GUILD), { body: commands })
	.then((data) => console.log(`Successfully registered ${data.length} application commands.`))
	.catch(console.error);

let guild;
let leftUsers;
let rightUsers;

let groups = {right: [], left: []};

bot.login(TOKEN);

/*******************************
 *        EVENT HANDLERS       *
 ******************************/

/*****************
 *   ON READY    *
 *****************/
bot.on('ready', async () => {
    
    console.log("bot ready");
    guild = await bot.guilds.fetch(DISCORD_GUILD);
    const ruleChannel = await guild.channels.fetch(CHANNEL_ID);

    if(ruleChannel) {
        const ruleMessage = await ruleChannel.messages.fetch(SPLITTER_MESSAGE_ID);
        if(ruleMessage) {
            leftUsers = await ruleMessage.reactions.resolve('⬅️').users.fetch()
            rightUsers = await ruleMessage.reactions.resolve('➡️').users.fetch()

            console.log(leftUsers)
            groups.left = Array.from(leftUsers.values());
            groups.right = Array.from(rightUsers.values());
            console.log(groups.left)
        }
    }
    
});


// bot.on('messageReactionAdd', async (reaction, user) => {
// 	if (reaction.partial) {
// 		try {
// 			await reaction.fetch();
// 		} catch (error) {
// 			console.error('Something went wrong when fetching the message:', error);
// 			return;
// 		}
// 	}

//     if(reaction.message.id !== SPLITTER_MESSAGE_ID) return;

//     if ( reaction.emoji.name == '➡️') {
//         console.log(`${user.username} is on the right`)
//         groups.right.push(user)
//     } else if( reaction.emoji.name == '⬅️' ) {
//         console.log(`${user.username} is on the left`)
//         groups.left.push(user)
//     }
// });



bot.on('interactionCreate', async ( interaction ) => {
    if(interaction.isButton()) {
        let moveCount = 0;
        guild.members.fetch({user: groups.left.concat(groups.right)}).then((members) => {
            if(interaction.customId === 'split') {
                groups.left.forEach(user => {
                    const member = members.get(user.id)
                    console.log(`Moving ${user.username} to LEFT`)
                    if(member.voice.channel) {
                        member.voice.setChannel(LEFT_VC)
                        console.log(`Moved ${user.username} to LEFT`)
                        moveCount++;
                    } else {
                        console.log(`FAILED to move ${user.username} to LEFT`)
                    }
                })
                groups.right.forEach(user => {
                    const member = members.get(user.id)
                    console.log(`Moving ${user.username} to RIGHT`)
                    if(member.voice.channel) {
                        member.voice.setChannel(RIGHT_VC)
                        console.log(`Moved ${user.username} to RIGHT`)
                        moveCount++;
                    } else {
                        console.log(`FAILED to move ${user.username} to RIGHT`)
                    }
                })
            } 
            else if(interaction.customId === 'join') {
                groups.left.concat(groups.right).forEach(user => {
                    const member = members.get(user.id)
                    console.log(`Moving ${user.username} to COMBO`)
                    if(member.voice.channel) {
                        member.voice.setChannel(COMBINED_VC)
                        console.log(`Moving ${user.username} to COMBO`)
                        moveCount++;
                    } else {
                        console.log(`FAILED to move ${user.username} to COMBO`)
                    }
                })
            }
            interaction.reply({content: `Moved ${moveCount} users`, ephemeral: true})
        });
    }
	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === 'vcsplit') {
        let content = "Left Users: \n ----------------------\n";
        leftUsers.map(leftUser => leftUser.username).forEach(username => content += username + ",\n");
        content += "\nRight Users: \n ----------------------\n"
        rightUsers.map(rightUser => rightUser.username).forEach(username => content += username + ",\n");
		const row = new ActionRowBuilder()
			.addComponents( [
                new ButtonBuilder()
					.setCustomId('split')
					.setLabel('Split')
					.setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
					.setCustomId('join')
					.setLabel('Join')
					.setStyle(ButtonStyle.Primary),
        ]);

		await interaction.reply({ content: content , components: [row], ephemeral: true });
        
	}
});
