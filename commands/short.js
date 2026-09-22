const { ApplicationCommandOptionType: Options } = require('discord.js');
const randomstring = require('randomstring');

const main = require('../main');
const utils = require('../utils');

const Page = require('../schemas/page');

const Domain = require('../domain.json');

module.exports = {
    info: {
        name: 'short',
        description: 'URL을 짧게 만들어줍니다.',
        options: [
            {
                name: 'url',
                description: '짧게 만들 URL입니다.',
                type: Options.String,
                required: true
            }
        ]
    },
    checkPermission: async interaction => {
        const domain = interaction.dbUser.selectedDomain;

        if(domain === Domain[0].domain || main.getTeamOwner() === interaction.user.id) return true;

        const result = interaction.dbUser?.allowedDomains.includes(domain);
        if(!result) await interaction.reply(utils.missingPermissionMessage(interaction, `${domain} 관리`));

        return result;
    },
    handler: async interaction => {
        const url = interaction.options.getString('url');

        if(!utils.validateURL(url)) return interaction.reply({
            embeds: [utils.errorEmbed(interaction, '올바른 URL이 아닙니다!')],
            ephemeral: true
        });

        const domain = interaction.dbUser.selectedDomain || Domain[0].domain;
        if(!(interaction.teamOwner || interaction.dbUser.allowedDomains.includes(domain)) || !Domain.some(d => d.domain === domain)) return interaction.reply({
            content: '사용할 수 없는 도메인입니다.',
            ephemeral: true
        });

        const page = new Page({
            domain,
            url: randomstring.generate(main.getOwnerID().includes(interaction.user.id) ? 4 : 8),
            flows: [{
                condition: {
                    id: 'EVERYONE'
                },
                action: {
                    id: 'REDIRECT',
                    data: {
                        url
                    }
                }
            }],
            creator: interaction.user.id
        });
        await page.save();

        return interaction.reply(utils.formatUrl(page.domain, page.url));
    }
}
