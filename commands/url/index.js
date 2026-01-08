const { ApplicationCommandOptionType: Options } = require('discord.js');

const main = require('../../main');
const utils = require('../../utils');

const Page = require('../../schemas/page');

const Domain = require('../../domain.json');

const choices = Domain.map(a => ({
    name: a.domain,
    value: a.domain
}));

module.exports = {
    info: {
        name: 'url',
        description: 'URL 관리 명령어입니다.',
        options: [
            {
                name: 'create',
                description: '새 URL을 생성합니다.',
                type: Options.Subcommand,
                options: [
                    {
                        name: 'customurl',
                        description: `커스텀 URL입니다. 루트 페이지를 수정하려면 /를 사용하세요. ${utils.formatUrl(Domain[0].domain, 'custom')} 형식으로 표시됩니다.`.substring(0, 100),
                        type: Options.String
                    },
                    {
                        name: 'dest',
                        description: 'URL이 이동할 대상입니다.',
                        type: Options.String
                    },
                    {
                        name: 'domain',
                        description: 'URL이 사용할 도메인입니다.',
                        type: Options.String,
                        choices
                    }
                ]
            },
            {
                name: 'edit',
                description: 'URL을 수정합니다.',
                type: Options.Subcommand,
                options: [
                    {
                        name: 'url',
                        description: '수정할 URL입니다. 루트 페이지를 수정하려면 /를 사용하세요.',
                        type: Options.String,
                        required: true,
                        autocomplete: true
                    }
                ]
            },
            {
                name: 'delete',
                description: 'URL을 삭제합니다.',
                type: Options.Subcommand,
                options: [
                    {
                        name: 'url',
                        description: '삭제할 URL입니다. 루트 페이지를 수정하려면 /를 사용하세요.',
                        type: Options.String,
                        required: true,
                        autocomplete: true
                    }
                ]
            },
            {
                name: 'list',
                description: '도메인의 URL 목록을 표시합니다.',
                type: Options.Subcommand,
                options: [
                    {
                        name: 'domain',
                        description: 'URL 목록을 확인할 도메인입니다.',
                        type: Options.String,
                        choices
                    }
                ]
            }
        ]
    },
    checkPermission: async interaction => {
        if(main.getTeamOwner() === interaction.user.id) return true;

        const parsedUrl = utils.parseUrl(interaction.options.getString('url', false));

        const domain = parsedUrl.domain ?? interaction.options.getString('domain', false) ?? interaction.dbUser.selectedDomain;
        const result = interaction.dbUser?.allowedDomains.includes(domain);

        const permLength = interaction.dbUser?.allowedDomains.length || 0;

        if(!result) await interaction.reply(utils.missingPermissionMessage(interaction, permLength ? `${domain} 관리` : '도메인 관리'));

        return result;
    },
    handler: utils.subCommandHandler('url'),
    autoCompleteHandler: async interaction => {
        let query = interaction.options.getString('url');
        if(!query) return interaction.respond([]);

        const parsedUrl = utils.parseUrl(query);
        if(parsedUrl.domain) query = parsedUrl.url;

        const selectedDomain = parsedUrl.domain ?? interaction.dbUser.selectedDomain;

        const regex = new RegExp(query, 'i');
        const pages = await Page.find({
            url: {
                $regex: regex
            }
        })
            .sort({
                url: 1
            })
            .limit(50);

        const result = pages.filter(a => a.domain === selectedDomain).slice(0, 25);
        if(result.length < 25) result.push(...pages.filter(a => a.domain !== selectedDomain && (interaction.teamOwner || interaction.dbUser.allowedDomains.includes(a.domain))).slice(0, 25 - result.length));

        return interaction.respond(result.map(a => ({
            name: utils.formatUrl(Domain.find(d => d.domain === a.domain)?.domain, a.url),
            value: `id/${a.id}`
        })));
    }
}