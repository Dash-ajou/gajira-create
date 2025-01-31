const Jira = require('./common/net/Jira')

module.exports = class {
  constructor ({ githubEvent, argv, config }) {
    this.Jira = new Jira({
      baseUrl: config.baseUrl,
      token: config.token,
      email: config.email,
    })

    this.config = config
    this.argv = argv
    this.githubEvent = githubEvent
  }

  async execute () {
    const { argv } = this
    const projectKey = argv.project
    const issuetypeName = argv.issuetype

    // map custom fields
    const { projects } = await this.Jira.getCreateMeta({
      expand: 'projects.issuetypes.fields',
      projectKeys: projectKey,
      issuetypeNames: issuetypeName,
    })

    if (projects.length === 0) {
      console.error(`project '${projectKey}' not found`)

      return
    }

    const [project] = projects

    if (project.issuetypes.length === 0) {
      console.error(`issuetype '${issuetypeName}' not found`)

      return
    }

    let providedFields = [{
      key: 'project',
      value: {
        key: projectKey,
      },
    }, {
      key: 'issuetype',
      value: {
        name: issuetypeName,
      },
    }, {
      key: 'summary',
      value: argv.summary,
    }]

    if (argv.description) {
      providedFields.push({
        key: 'description',
        value: argv.description,
      })
    }

    if (argv.fields) {
      providedFields = [...providedFields, ...this.transformFields(argv.fields)]
    }

    const payload = providedFields.reduce((acc, field) => {
      acc.fields[field.key] = field.value

      return acc
    }, {
      fields: {},
    })

    const issue = await this.Jira.createIssue(payload)
    const issueKey = issue.key;
    console.log(`issue created: ${issueKey}`);

    if (!argv?.description) return { issue: issueKey }

    // subtask sync
    const new_description = await this.createSubtask(projectKey, issueKey, argv.description);
    payload.fields.description = new_description;
    await this.Jira.updateIssue(issueKey, payload);
    console.log(`sbutask sync complete: ${issueKey}`);

    return { issue: issueKey };
  }

  transformFields (fieldsString) {
    const fields = JSON.parse(fieldsString)

    return Object.keys(fields).map(fieldKey => ({
      key: fieldKey,
      value: fields[fieldKey],
    }))
  }

  async createSubtask(projectKey, issueKey, desc) {
    const subtask_titles = [ ...desc.matchAll(/(\- \[).{0,}\n/g) ]
      .map(v => {
        const a = {
          origin: v[0],
          summary: v[0].replace(/^\s*-\s*\[(x|\s)?\]\s*/, "").replace(/\n+$/, "").trim(),
          loc: v.index
        };
        console.log(`subtask detected: ${a.summary}`);
        a.prefix = a.origin.replace(` ${a.summary}`, "");
        return a;
      });

    if (subtask_titles.length == 0) return desc;

    await Promise.all(
      subtask_titles.map(async ({prefix, origin, summary}) => {
        const issue = await this.Jira.createIssue({
          fields: {
            project: {key: projectKey},
            issuetype: {name: "Subtask"},
            summary,
            description: `
              h2. 하위 작업: ${ summary }
              
              h3. 작업이력
              - ${ this.getCurrentDateTime() } : 하위작업 자동생성 by ${ issueKey }

            `,
            parent: {key: issueKey}
          }
        });
        console.log(`subtask created: "${origin}" -> "${origin.replace(/\n+$/, "")} ${issue.key}"`);
        desc = desc.replace(origin, `${origin.replace(/\n+$/, "")} ${issue.key}\n`);
        return true;
      })
    )
    return desc;
  }
  getCurrentDateTime(date) {
    if (!date) {
      date = new Date();
      const utc = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
      const KR_TIME_DIFF = 9 * 60 * 60 * 1000;
      date = new Date(utc + (KR_TIME_DIFF));
    }
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
}
