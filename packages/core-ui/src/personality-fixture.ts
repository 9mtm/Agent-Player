import type { PersonalityProposal } from './personality-contract.js';
export const fictionalPersonalityProposal: PersonalityProposal = {
  "id": "11111111-1111-4111-8111-111111111111",
  "agentId": "sample-main",
  "baseVersion": 1,
  "baseTraits": {
    "doubt": 50,
    "caution": 50,
    "creativity": 50,
    "thoroughness": 50,
    "independence": 50,
    "verbosity": 50,
    "warmth": 50,
    "curiosity": 50,
    "persistence": 50
  },
  "proposedTraits": {
    "doubt": 50,
    "caution": 55,
    "creativity": 50,
    "thoroughness": 50,
    "independence": 50,
    "verbosity": 50,
    "warmth": 50,
    "curiosity": 50,
    "persistence": 50
  },
  "delta": {
    "caution": 5
  },
  "reason": "Fictional review: ask before significant changes.",
  "evidence": [
    "fictional:review/one",
    "Fictional owner feedback; no real conversation."
  ],
  "source": "agent",
  "status": "pending",
  "createdBy": "fictional-agent",
  "createdAt": "2026-10-14T10:00:00.000Z",
  "decidedBy": null,
  "decidedAt": null,
  "decisionNote": null,
  "appliedVersion": null,
  "reviewHash": "53cb2f0cad35ceaf5397637d6afe000970c09019731fa51c4a1b84e8cfdd8e91"
};
