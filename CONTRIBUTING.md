# Contributing to Oalpaca

Thank you for your interest in contributing to Oalpaca! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Guidelines](#guidelines)
- [Local Setup](#local-setup)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
  - [Building the App](#building-the-app)
- [How to Contribute](#how-to-contribute)
  - [Reporting Issues](#reporting-issues)
  - [Submitting Pull Requests](#submitting-pull-requests)
  - [Coding Standards](#coding-standards)

## Guidelines

1. **Be respectful and inclusive** - Treat all contributors with respect and courtesy.
2. **Follow the code of conduct** - Be kind, welcoming, and inclusive in all interactions.
3. **Use clear and descriptive communication** - Provide detailed explanations and context.
4. **Test your changes** - Ensure your changes work correctly before submitting.
5. **Keep changes focused** - Submit small, focused pull requests rather than large, sweeping changes.
6. **Document your code** - Add comments and update documentation as needed.
7. **Respect the existing architecture** - Follow the patterns and conventions already established in the codebase.

## Local Setup

### Prerequisites

Before setting up Oalpaca locally, you need to install the following tools:

| Tool | Purpose | Installation |
|------|---------|--------------|
| [Ollama](https://ollama.com) | Local LLM runtime | `curl -fsSL https://ollama.com/install.sh \| sh` |
| [Rust](https://rust-lang.org) | Backend language | [rustup.rs](https://rustup.rs) |
| [nvm](https://github.com/nvm-sh/nvm) | Node.js version manager | [nvm.sh](https://github.com/nvm-sh/nvm) |
| [Bun](https://bun.sh) | JavaScript runtime & package manager | `curl -fsSL https://bun.sh/install \| bash` |

#### Installing Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Make sure to install the stable toolchain:

```bash
rustup default stable
```

#### Installing nvm

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
# or
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
```

After installation, restart your terminal and run:

```bash
nvm install lts/*
nvm use lts/*
```

#### Installing Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/dinocodesx/oalpaca.git
cd oalpaca
```

2. **Install frontend dependencies**

```bash
bun install
```

3. **Verify Ollama is running**

```bash
ollama --version
ollama serve
```

In a separate terminal, you can test Ollama:

```bash
ollama run ministral-3
```

### Running the App

#### Development Mode

To run the app in development mode with hot reload:

```bash
bun run tauri dev
```

This will:
- Start the Vite dev server for the frontend
- Build and run the Tauri application
- Enable developer tools for debugging

#### Running Frontend Only

For frontend development without the Tauri backend:

```bash
bun run dev
```

This runs the React app at `http://localhost:5173` (default Vite port).

### Building the App

#### Production Build

To create a production build:

```bash
bun run tauri build
```

This will:
- Compile the Rust backend
- Bundle the frontend assets
- Create platform-specific installers

The built application will be in `src-tauri/target/release/bundle/`.

#### Building for Specific Platforms

```bash
# macOS
bun run tauri build --target aarch64-apple-darwin
bun run tauri build --target x86_64-apple-darwin

# Linux
bun run tauri build --target x86_64-unknown-linux-gnu

# Windows
bun run tauri build --target x86_64-pc-windows-msvc
```

## How to Contribute

### Reporting Issues

Before submitting an issue, please:

1. **Search existing issues** - Check if the issue has already been reported.
2. **Use the correct template** - Use the Bug Report or Feature Request template.
3. **Provide detailed information** - Include steps to reproduce, expected behavior, and actual behavior.
4. **Include system information** - OS, versions of relevant tools (Ollama, Rust, Node, Bun).
5. **Add screenshots** - If applicable, include screenshots or logs.

### Submitting Pull Requests

1. **Fork the repository**
2. **Create a feature branch**

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

3. **Make your changes** - Follow the coding standards.
4. **Test your changes** - Ensure everything works correctly.
5. **Commit your changes** - Use clear, descriptive commit messages.

```bash
git commit -m "feat: add new feature description"
git commit -m "fix: resolve issue description"
```

6. **Push to your fork**

```bash
git push origin feature/your-feature-name
```

7. **Submit a Pull Request** - Use the pull request template and fill in all sections.

#### Pull Request Guidelines

- Keep PRs focused and reasonably sized
- Link related issues
- Include screenshots for UI changes
- Update documentation if needed
- Ensure all CI checks pass

### Coding Standards

#### General

- Use clear, descriptive variable and function names
- Keep functions small and focused
- Write comments for complex logic
- Follow existing code style

#### Frontend (React/TypeScript)

- Use functional components with hooks
- Follow React best practices
- Use TypeScript for type safety
- Keep components modular and reusable

#### Backend (Rust)

- Follow Rust idioms and best practices
- Use proper error handling
- Write documentation for public APIs
- Run `cargo fmt` before committing

#### Formatting

The project uses the following formatters:

```bash
# Format Rust code
cargo fmt

# Frontend formatting is handled by Bun/Vite
```

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to the project maintainers.

## Getting Help

- Check the [README.md](README.md) for basic setup instructions
- Search existing issues and discussions
- Open a new issue for questions

## License

By contributing to Oalpaca, you agree that your contributions will be licensed under the [MIT License](LICENSE).
