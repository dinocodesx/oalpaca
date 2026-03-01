# Oalpaca Studio - The Best Ollama GUI

https://github.com/user-attachments/assets/0e632da8-45e5-4241-a811-b18acc3c5103

The Ollama GUI is a popular tool for interacting with Ollama models. However, it has some limitations, such as not supporting multiple models or not being able to customize the prompt. Oalpaca is an alternative that provides a more flexible and customizable experience.

* Oalpaca is being currently developed and is not in pre-release. 

* Currently the plan is to have the same functionality of that provided by LMStudio out of the box.

## Local Setup

Before running Oalpaca, you need to have Ollama installed. Other than that, you need to have [node](https://nodejs.org/en/download/), [rust](https://www.rust-lang.org/tools/install) and [bun](https://bun.sh) installed on your system. You can install them by referring to the official documentation.

### Install Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

```bash
ollama run ministral-3
```

### Git clone the repository

```bash
git clone https://github.com/dinocodesx/oalpaca.git
```

```bash
cd oalpaca
```

```bash
bun install
```

```bash
bun run tauri dev
```

The local development environment is now set up and you can start developing Oalpaca.

## Contributing

Contributions are welcome! Please read the [CONTRIBUTING.md](CONTRIBUTING.md) file for more information.
