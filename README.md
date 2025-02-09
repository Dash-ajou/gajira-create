---------
⚠️ This repository is on-develop
---------

# Jira Create
Github Issue를 Jira Issue로 함께 등록시켜주는 GitHub Action Workflow Tool

> ##### Jira Cloud에서만 사용할 수 있습니다.

## 사용법


> ##### 본 Tool 사용을 위해서는 [Jira Login Action](https://github.com/marketplace/actions/jira-login)이 필요합니다
```yaml
- name: Create
  id: create
  uses: Dash-ajou/gajira-create@main
  with:
    project: GA
    issuetype: Build
    summary: Build completed for ${{ github.repository }}
    description: Compare branch
    fields: '{"customfield_10171": "test"}'
    assignee: ${{ github.event.issue.user.login }}

- name: Log created issue
  run: echo "Issue ${{ steps.create.outputs.issue }} was created"
```

----
## 기능

### Github Issue 등록

- Github Issue로 등록된 내용이 그대로 Jira Cloud에 등록됩니다.
- 입력필드에 따라 요약, 설명, 담당자 등의 정보를 연동할 수 있습니다.

### Subtask 자동추가

- Github Issue의 설명에 markdown 형식으로 체크박스를 표시한 경우, 본 step 실행 시 자동으로 subtask형태로 변환되어 추가/연결됩니다.
- 체크상태에 따라 '완료' 또는 '해야 할 일'로 추가됩니다.
- 추가된 subtask는 생성되는 issue를 부모로 생성됩니다. 

```markdown
# 인식유형

- [X] 맛있는 치킨 사먹기 ('완료' 상태로 자동추가)
- [ ] 치킨 인증샷 찍어서 팀원 놀리기 ('해야 할 일' 상태로 자동추가)
- [] 팀원들과 닭다리 쟁탈전 ('해야 할 일' 상태로 자동추가)

```

----
## Action Spec:

### Environment variables
- None

### Inputs
- `project` (required) - Jira 프로젝트 Key
- `issuetype` (required) - 생성할 Issue의 type
- `summary` (required) - Issue의 '요약'
- `description` - Issue의 '설명'
- `assignee` - Issue의 '담당자' 이름
- `fields` - JSON format으로 전달되는 추가필드


### Outputs
- `issue` - Key of the newly created issue
