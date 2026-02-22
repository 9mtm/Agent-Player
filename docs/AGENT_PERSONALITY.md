# Agent Personality System

Each agent has its own identity defined by files and learned knowledge.

**Location:** `.data/agents/{agentId}/`

---

## Agent Files Structure

```
.data/agents/{agentId}/
├── PERSONALITY.md          # Agent's core identity
├── MEMORY.md               # Accumulated knowledge
└── knowledge/              # Additional context files
    ├── guidelines.md
    ├── faq.md
    └── ...
```

---

## PERSONALITY.md

Defines the agent's core identity and behavior.

### Example

```markdown
# Agent Personality

## Name
Technical Support Assistant

## Role
You are a friendly technical support agent specializing in software troubleshooting.

## Personality Traits
- Patient and helpful
- Clear and concise explanations
- Proactive problem-solving
- Empathetic to user frustrations

## Communication Style
- Use simple, non-technical language when possible
- Ask clarifying questions before jumping to solutions
- Provide step-by-step instructions
- Always offer to help further

## Knowledge Areas
- Software installation and configuration
- Common error messages and fixes
- Basic network troubleshooting
- Account and login issues

## Limitations
- Cannot access user's computer directly
- Cannot reset passwords (guide user to reset flow)
- Cannot install software remotely
```

### How to Use

1. **Go to:** `/dashboard/agents/{id}/files`
2. **Click:** "Personality" tab
3. **Edit:** Markdown content
4. **Save:** Changes apply immediately

---

## MEMORY.md

Stores learned knowledge and patterns from conversations.

### Example

```markdown
# Agent Memory

## Learned Patterns

### Common User Issues
- Database connection timeout → Usually firewall blocking port 5432
- App crashes on startup → Clear cache in %AppData% folder
- Slow performance → Check background processes in Task Manager

### Successful Solutions
- **2026-02-20:** Fixed login issue by clearing browser cookies
- **2026-02-19:** Resolved installation error by running as administrator
- **2026-02-18:** Solved network error by disabling VPN

### User Preferences
- Prefers command-line solutions over GUI
- Familiar with Linux environment
- Works in software development team

### Important Context
- Company uses PostgreSQL database (port 5432)
- Internal server: db.company.local
- Support ticket system: support.company.com
```

### How Memory Works

1. **Automatic:** Agent can update memory during conversations
2. **Manual:** Edit via `/dashboard/agents/{id}/files` → "Memory" tab
3. **Tools:** Agent uses `memory_save` tool to record patterns
4. **Retrieval:** Agent references memory in future conversations

---

## Knowledge Files

Additional context files stored in `knowledge/` folder.

### Example Structure

```
knowledge/
├── company-policies.md
├── product-documentation.md
├── troubleshooting-guide.md
└── faq.md
```

### How to Add

1. **Go to:** `/dashboard/agents/{id}/files`
2. **Click:** "Knowledge" tab
3. **Upload:** Markdown or text files
4. **Agent:** Automatically references these files when relevant

---

## Priority System

When agent responds, content is loaded in this order:

1. **PERSONALITY.md** (if exists)
2. **Database system_prompt** (fallback)
3. **MEMORY.md** (accumulated knowledge)
4. **Knowledge files** (additional context)
5. **Session context** (current conversation)

**Final prompt structure:**
```
[Base System Prompt]
[Agent Personality from PERSONALITY.md]
[Agent Memory from MEMORY.md]
[Session Context]
[User Message]
```

---

## Memory Tools

Agents can manage their own memory using these tools:

### memory_save
Save new knowledge pattern
```javascript
{
  "category": "troubleshooting",
  "pattern": "Database timeout usually means firewall blocking port",
  "context": "Solved 5 similar issues this week"
}
```

### memory_search
Search existing memory
```javascript
{
  "query": "database connection issues"
}
```

### memory_reflect
Analyze patterns and insights
```javascript
{
  "period": "last_week",
  "focus": "common_problems"
}
```

### memory_stats
Get memory statistics
```javascript
{}
```

---

## Best Practices

### PERSONALITY.md

✅ **Do:**
- Define clear role and responsibilities
- Specify communication style
- Set boundaries and limitations
- Keep under 500 words

❌ **Don't:**
- Include temporary information
- Write long essays
- Use vague descriptions
- Mix personality with memory

### MEMORY.md

✅ **Do:**
- Record successful solutions
- Document learned patterns
- Track user preferences
- Update regularly

❌ **Don't:**
- Store sensitive data
- Include temporary notes
- Duplicate PERSONALITY.md content
- Let it grow unbounded (clean old entries)

### Knowledge Files

✅ **Do:**
- Organize by topic
- Use clear filenames
- Keep files focused
- Update when information changes

❌ **Don't:**
- Upload large files (>1MB)
- Include duplicate information
- Use complex formatting
- Mix multiple topics in one file

---

## Examples

### Customer Support Agent

**PERSONALITY.md:**
```markdown
# Customer Support Agent

## Role
Friendly customer support for e-commerce platform

## Style
- Warm and welcoming
- Solution-focused
- Apologetic when appropriate
- Proactive follow-up

## Knowledge
- Order tracking and shipping
- Returns and refunds
- Account management
- Product catalog
```

**MEMORY.md:**
```markdown
# Memory

## Common Issues
- Shipping delays → Check carrier status first
- Wrong item → Process replacement immediately
- Payment failed → Verify card details and billing address

## Customer Patterns
- 80% of issues resolved with order tracking link
- Peak support hours: 2-4 PM weekdays
- Most returns: wrong size (clothing)
```

---

### Technical Writer Agent

**PERSONALITY.md:**
```markdown
# Technical Writer

## Role
Create clear, concise technical documentation

## Style
- Simple language
- Step-by-step instructions
- Visual aids when helpful
- Beginner-friendly

## Expertise
- API documentation
- User guides
- Installation manuals
- Troubleshooting guides
```

**MEMORY.md:**
```markdown
# Memory

## Writing Patterns
- Always start with prerequisites
- Use numbered lists for procedures
- Include code examples for APIs
- Add "Common Pitfalls" section

## User Feedback
- Users prefer short paragraphs
- Screenshots increase clarity by 60%
- Examples more valuable than theory
```

---

## API Access

### Get Agent Files
```bash
GET /api/agents/:id/files
```

### Update Personality
```bash
PUT /api/agents/:id/files/personality
Content-Type: text/plain

# New PERSONALITY.md content
```

### Update Memory
```bash
PUT /api/agents/:id/files/memory
Content-Type: text/plain

# New MEMORY.md content
```

### Upload Knowledge File
```bash
POST /api/agents/:id/files/knowledge
Content-Type: multipart/form-data

file: guidelines.md
```

---

## File Limits

- **PERSONALITY.md:** Max 10 KB (~2000 words)
- **MEMORY.md:** Max 50 KB (~10,000 words)
- **Knowledge files:** Max 1 MB each
- **Total knowledge folder:** Max 10 MB

---

## Security

- Agent files stored in `.data/agents/` (gitignored)
- Each agent has isolated directory
- Path traversal prevention (sanitized filenames)
- Only agent owner can access files
