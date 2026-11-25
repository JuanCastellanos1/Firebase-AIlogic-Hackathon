# Installed Firebase agent skills

User authorized local tooling and reviewed official Firebase skill installation. Upstream: https://github.com/firebase/agent-skills ; reviewed revision: `99954a30898bb5ddc8152ee10e124dc3b4106bf7`.

Installed globally under `~/.agents/skills/` and now visible to the skill loader:

| Skill ID | Installed | Folder hash (lock) | Load when |
|---|---|---|---|
| firebase-auth-basics | preflight | `ee4364167c59d8c5eb99c1f02383346a2a1d2fd1` | Implementing or testing sign-in/session behavior |
| firebase-firestore | preflight | `19908d324efc45714b6520f0ff8d0c8150f532b1` | Designing or implementing Firestore records and queries |
| firebase-ai-logic-basics | preflight | `2f45dc17630ad5045139fa0fa63a680879b11980` | Adding local/cloud inference or App Check |
| firebase-security-rules-auditor | preflight | `88cb827c95d7266070b6dbc45afd8935a3770113` | Reviewing authorization and Rules |
| firebase-hosting-basics | preflight | `600d72f9f565a5cb3856413c8d373db90d6361e0` | Configuring static hosting, only within approved delivery scope |
| firestore-rules-creation | Rules cut | `0dbc00cf86de7935d6b02c04a2d5dee680d35b3b` | Authoring or hardening `firestore.rules` when the `firestore-rules-author` subagent is unavailable |

The guide's edition-specific Firestore names map to references inside firebase-firestore; the actual installed Rules audit ID is firebase-security-rules-auditor. `firebase-firestore` delegates Rules authoring to `firestore-rules-creation`; that skill was absent during preflight and was installed at the same pinned revision for the Rules cut (`npx -y skills@latest add firebase/agent-skills@99954a30898bb5ddc8152ee10e124dc3b4106bf7 -s firestore-rules-creation -g -a opencode -y --json`). No `firestore-rules-author` subagent is available in this environment, so the skill's documented direct-authoring fallback applied and the skill was loaded by its discovered ID.

Use the actual skill loader ID for each relevant task; installation is not proof of use. At most three skills per artifact/task. Record loaded skills with implementation evidence. Installed copies are pinned by recorded revision and content hashes in docs/verification.md; re-review before updates. No Firebase MCP, cloud provisioning, spending, or deployment was enabled by skill installation.
