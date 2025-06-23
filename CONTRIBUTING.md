# 🤝 Contributing to Dpro Agent Player

Thank you for your interest in contributing to Dpro Agent Player! We welcome contributions from developers around the world.

## 📋 Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [Development Guidelines](#-development-guidelines)
- [Contribution Process](#-contribution-process)
- [Project Structure](#-project-structure)
- [Coding Standards](#-coding-standards)
- [Testing](#-testing)
- [Documentation](#-documentation)
- [Community](#-community)

---

## 🛡️ Code of Conduct

### Our Pledge
We are committed to making participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity, level of experience, nationality, personal appearance, race, religion, or sexual identity.

### Expected Behavior
- **Be respectful** and inclusive in your communication
- **Be collaborative** and help others learn
- **Be constructive** in feedback and discussions
- **Be patient** with new contributors
- **Use English** for all communications and code

### Unacceptable Behavior
- Harassment, discrimination, or offensive comments
- Trolling, spamming, or disruptive behavior
- Publishing private information without permission
- Any behavior that would be inappropriate in a professional setting

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18.0.0 or higher
- **Python** 3.9 or higher
- **Git** for version control
- **Code Editor** (VS Code recommended)

### Fork and Clone
1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/Dpro-AI-Agent.git
   cd Dpro-AI-Agent
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/Dpro-at/Dpro-AI-Agent.git
   ```

### Setup Development Environment

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### Frontend Setup
```bash
cd frontend
npm install
```

#### Environment Configuration
1. Copy `backend/ENVIRONMENT_SETUP.md` for detailed setup instructions
2. Create `.env` file in backend directory
3. Add your API keys (optional for basic development)

---

## 📝 Development Guidelines

### ⚠️ CRITICAL RULES

1. **English Only**: All code, comments, and documentation must be in English
2. **Source Attribution**: When modifying the software, you must cite the original source
3. **Documentation Updates**: Update relevant documentation with any changes
4. **Test Your Changes**: Ensure all tests pass before submitting
5. **Follow Existing Patterns**: Maintain consistency with the existing codebase

### Development Workflow

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test your changes** thoroughly

4. **Update documentation** if needed

5. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request** on GitHub

---

## 🏗️ Project Structure

### Backend (`/backend`)
```
backend/
├── api/           # API endpoints organized by feature
├── config/        # Configuration and settings
├── core/          # Core system components
├── models/        # Pydantic data models
├── services/      # Business logic services
└── main.py        # Application entry point
```

### Frontend (`/frontend`)
```
frontend/
├── src/
│   ├── components/  # Reusable UI components
│   ├── pages/       # Application pages
│   ├── services/    # API service layer
│   ├── hooks/       # Custom React hooks
│   └── types/       # TypeScript definitions
```

---

## 💻 Coding Standards

### Python (Backend)
- **PEP 8** compliance
- **Type hints** for all functions
- **Docstrings** for classes and functions
- **English** names and comments only

```python
def create_agent(name: str, config: Dict[str, Any]) -> Agent:
    """
    Create a new AI agent with specified configuration.
    
    Args:
        name: The agent name
        config: Agent configuration dictionary
        
    Returns:
        Agent: The created agent instance
    """
    # Implementation here
```

### TypeScript (Frontend)
- **Strict TypeScript** configuration
- **Interface definitions** for all data structures
- **Functional components** with hooks
- **English** names and comments only

```typescript
interface AgentConfig {
  name: string;
  model: string;
  temperature: number;
}

const CreateAgent: React.FC<{ config: AgentConfig }> = ({ config }) => {
  // Component implementation
};
```

### General Guidelines
- Use **descriptive variable names**
- Keep functions **small and focused**
- Add **comments for complex logic**
- Follow **existing code patterns**
- Use **consistent formatting**

---

## 🧪 Testing

### Backend Testing
```bash
cd backend
python -m pytest tests/ -v
```

### Frontend Testing
```bash
cd frontend
npm test
```

### Test Coverage
- Aim for **80%+ code coverage**
- Test **critical business logic**
- Include **integration tests**
- Test **error scenarios**

### Writing Tests
- Use **descriptive test names**
- Follow **Arrange-Act-Assert** pattern
- Mock **external dependencies**
- Test **both success and failure cases**

---

## 📚 Documentation

### Required Documentation Updates
When making changes, update the following if applicable:

#### API Changes
- `backend/api/API_COMPLETE_DOCUMENTATION.md`
- Individual API documentation files
- OpenAPI/Swagger specifications

#### Feature Changes
- `README.md` (if it affects user experience)
- Component documentation
- Architecture diagrams if needed

#### Configuration Changes
- `backend/ENVIRONMENT_SETUP.md`
- Configuration documentation

#### Privacy & Compliance Changes
- `PRIVACY.md` - Privacy policy and compliance documentation
- Update compliance sections if privacy features change
- Document any new data processing activities

### Documentation Standards
- Use **clear, concise English**
- Include **code examples**
- Add **screenshots** for UI changes
- Keep **table of contents** updated
- Use **consistent formatting**

---

## 🔄 Contribution Process

### 1. Issue Discussion
- **Check existing issues** before creating new ones
- **Discuss major changes** before implementation
- **Use issue templates** when available
- **Add appropriate labels**

### 2. Pull Request Guidelines

#### PR Title Format
- `feat: add new agent creation workflow`
- `fix: resolve chat message ordering issue`
- `docs: update API documentation`
- `refactor: improve error handling`

#### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Testing
- [ ] Tests pass locally
- [ ] Added new tests if needed
- [ ] Tested in browser/environment

## Documentation
- [ ] Updated relevant documentation
- [ ] Added code comments where needed

## Attribution
This contribution builds upon Dpro Agent Player
Original source: https://github.com/Dpro-at/Dpro-AI-Agent
```

### 3. Review Process
- **Automated checks** must pass
- **Code review** by maintainers
- **Address feedback** promptly
- **Squash commits** if requested

---

## 🎯 Types of Contributions

### 🐛 Bug Fixes
- Fix existing functionality issues
- Improve error handling
- Resolve performance problems

### ✨ New Features
- Add new AI agent capabilities
- Enhance user interface
- Improve workflow management

### 📝 Documentation
- Improve existing documentation
- Add usage examples
- Create tutorial content

### 🧪 Testing
- Add missing test coverage
- Improve test reliability
- Add integration tests

### 🎨 UI/UX Improvements
- Enhance visual design
- Improve user experience
- Add accessibility features

---

## 🌟 Recognition

### Contributor Recognition
- Contributors listed in release notes
- Special recognition for significant contributions
- Opportunity to become a maintainer

### Attribution Requirements
All contributors must:
- **Cite the original source** in derivative works
- **Include proper attribution** in documentation
- **Acknowledge Dpro AI Agent** in related projects

---

## 💬 Community

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Pull Requests**: Code contributions and reviews

### Getting Help
- Check existing **documentation** first
- Search **existing issues** and discussions
- Ask questions in **GitHub Discussions**
- Contact maintainers: `opensource@dpro.dev`

### Community Guidelines
- **Be helpful** and supportive to others
- **Share knowledge** and experience
- **Respect different viewpoints**
- **Follow our code of conduct**

---

## 📞 Contact

For questions about contributing:
- **Email**: `opensource@dpro.dev`
- **GitHub**: [Dpro-at/Dpro-AI-Agent](https://github.com/Dpro-at/Dpro-AI-Agent)
- **Website**: [dpro.at](https://dpro.at)

---

## 🙏 Thank You

Thank you for contributing to Dpro AI Agent! Your contributions help make this project better for everyone.

**Remember**: When extending or modifying this software, always cite the original source and include proper attribution.

---

*This contributing guide is inspired by open-source best practices and tailored for the Dpro AI Agent project.* 