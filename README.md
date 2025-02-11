<h1 align='center'>Nvim Dashboard for VS Code</h1>

<img src="./assets/dash.png" alt="Nvim Dashboard for VS Code" width="100%">

A simple text based dashboard for VS Code inspired by [Nvim Dashboard](https://github.com/nvimdev/dashboard-nvim)

## Features

- Customizable hotkeys
- Customizable ascii art logo
- Customizable bottom message

## Usage

Adjust the settings to add your own hotkeys, logo, and messages. This may require some knowledge of the [VS Code API](https://code.visualstudio.com/api) and how to modify your settings JSON file. You may need to reload the window to see changes ("Developer: Reload Window" in the command palette).

## Plans

- [x] Recent projects
- [x] Customizable hotkeys
- [x] Customizable ascii art logo
- [x] Customizable bottom message
- [x] Recent files
- [ ] Color customization
- [ ] Additional themes
- [ ] Solve the issue of hotkeys being active when side bars are open and focused

## Known Issues

- I have not found a way to detect when the focus of the user has shifted from the dashboard to a different view (e.g., side bars, terminal, etc.). According to [this github issue](https://github.com/microsoft/vscode/issues/230419), this does not seem like it will be solved. This means that if you have the dashboard open and try to use a side bar or other view, the hotkeys will still be active. The only way to deactivate the hotkeys is to close the dashboard.

## Credits

- [Nvim Dashboard](https://github.com/nvimdev/dashboard-nvim)
- [Big Welcome](https://github.com/ArmanDris/big-welcome/tree/master)
- [VS Code: KeybindingMode](https://github.com/kubenstein/keybinding-mode/tree/master)
