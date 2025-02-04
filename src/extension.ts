const path = require('path');
const fs = require('fs');
const os = require('os');
import * as vscode from 'vscode';

class Logger {
    private static outputChannel: vscode.LogOutputChannel;

    public static init(): void {
        Logger.outputChannel = vscode.window.createOutputChannel(
            'Nvim Dashboard',
            { log: true }
        );
    }
    public static error(msg: string): void {
        Logger.outputChannel.error(msg);
    }
    public static warn(msg: string): void {
        Logger.outputChannel.warn(msg);
    }
    public static info(msg: string): void {
        Logger.outputChannel.info(msg);
    }
    public static debug(msg: string): void {
        Logger.outputChannel.debug(msg);
    }
    public static trace(msg: string): void {
        Logger.outputChannel.trace(msg);
    }
}
Logger.init();

// Get preferences
const config = vscode.workspace.getConfiguration('nvimDashboard');
const showDateTime: boolean | undefined = config.get('showDateTime');
const logoFont: string | undefined = config.get('logoFont');
const logoText: string | undefined = config.get('logoText');
const bottomText: string[] | undefined = config.get('bottomText');
const workspaceLimit: number | undefined = config.get('maxRecentProjects');
const filesLimit: number | undefined = config.get('maxRecentFiles');
const keybindsConfig:
    | { letter: string; name: string; command: string }[]
    | undefined = config.get('keybinds');
let keybinds: { [key: string]: string } = {};
keybindsConfig?.forEach(
    (keybind: { letter: string; name: string; command: string }) => {
        keybinds[keybind.letter] = keybind.command;
    }
);
let workspaceKeybinds: Map<string, string>;
let fileKeybinds: Map<string, string>;

/**
 * Gets the html content of the dashboard
 * @param context {vscode.ExtensionContext} - The context of the extension
 * @returns {string} - The html content
 */
function getHtmlContent(context: vscode.ExtensionContext) {
    Logger.debug('Getting html content');
    const indexPath = path.join(context.extensionPath, 'src', 'index.html');
    return fs.readFileSync(indexPath, 'utf8');
}

/**
 * Expands the home directory in a path
 * @param unexpanded_path {string} - The path to expand
 * @returns {string} - The expanded path
 */
function expandHomeDir(unexpanded_path: string) {
    Logger.debug(`Expanding home directory in path: ${unexpanded_path}`);
    if (unexpanded_path.startsWith('~')) {
        return path.join(os.homedir(), unexpanded_path.slice(1));
    }

    return unexpanded_path;
}

/**
 * Takes a full path and condenses down to home dir notation '~'
 * @param expandedPath {string} - the path to condense
 * @returns {string} - condensed path
 */
function condenseHomeDir(expandedPath: string) {
    Logger.debug(`Condensing home directory in path: ${expandedPath}`);
    if (!expandedPath.startsWith('~')) {
        const homeDirectory = os.homedir();
        return expandedPath.replace(homeDirectory, '~');
    }
}

/**
 * Opens a workspace in vscode
 * @param unexpanded_path {string} - The path to the workspace
 */
function openWorkspace(unexpanded_path: string) {
    Logger.info(`Opening workspace: ${unexpanded_path}`);
    const path = expandHomeDir(unexpanded_path);
    const workspaceUri = vscode.Uri.file(path);
    vscode.commands.executeCommand('vscode.openFolder', workspaceUri);
}

/**
 * Opens a file in vscode
 * @param unexpanded_path {string} - The path to the file
 */
function openFile(unexpanded_path: string) {
    Logger.info(`Opening file: ${unexpanded_path}`);
    const path = expandHomeDir(unexpanded_path);
    const fileUri = vscode.Uri.file(path);
    vscode.commands.executeCommand('vscode.open', fileUri);
}

/**
 * Removes workspaces from the context that no longer exist
 * @param context {vscode.ExtensionContext} - The context of the extension
 */
function cleanWorkspaces(context: vscode.ExtensionContext) {
    Logger.info('Cleaning workspaces');
    const workspaces = context.globalState.get('workspace', []);
    let filtered_workspace = workspaces.filter((unexpandedPath) => {
        const expandedPath = expandHomeDir(unexpandedPath);
        return fs.existsSync(expandedPath);
    });
    context.globalState.update('workspace', filtered_workspace);
}

/**
 * Clears the workspaces from the global state
 * @param context {vscode.ExtensionContext} - The context of the extension
 */
function clearRecentWorkspaces(context: vscode.ExtensionContext) {
    Logger.info('Clearing recent workspaces from global state');
    context.globalState.update('workspace', []);
}

/**
 * Clears the workspaces from the global state
 * @param context {vscode.ExtensionContext} - The context of the extension
 */
function clearRecentFiles(context: vscode.ExtensionContext) {
    Logger.info('Clearing recent files from global state');
    context.globalState.update('files', []);
}

/**
 * Creates a webview panel to display the dashboard
 * @param context {vscode.ExtensionContext} - The context of the extension
 * @returns {vscode.WebviewPanel} - The webview panel
 */
function showWelcomePage(
    context: vscode.ExtensionContext
): vscode.WebviewPanel {
    Logger.info('Creating dashboard webview panel');
    const panel = vscode.window.createWebviewPanel(
        'homePage',
        'Dashboard',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
        }
    );

    // const iconPath = vscode.Uri.file(
    //     path.join(context.extensionPath, 'src', 'open-book.png')
    // );
    // panel.iconPath = iconPath;

    // panel.webview.onDidReceiveMessage(
    //     (message) => {
    //         switch (message.command) {
    //             case 'openWorkspace':
    //                 openWorkspaceFunction(message.unexpanded_path);
    //                 break;
    //         }
    //     },
    //     undefined,
    //     context.subscriptions
    // );

    panel.webview.html = getHtmlContent(context);

    cleanWorkspaces(context);

    sendInformationtoFrontEnd(context, panel);

    // Panel handlers
    panel.onDidChangeViewState((e) => {
        let visible = e.webviewPanel.visible;
        let active = e.webviewPanel.active;
        Logger.debug(`Dashboard Visible: ${visible}, Active: ${active}`);
        if (!active) {
            enabled = false;
            vscode.commands.executeCommand(
                'setContext',
                'nvim-dashboard:enabled',
                false
            );
        } else {
            enabled = true;
            vscode.commands.executeCommand(
                'setContext',
                'nvim-dashboard:enabled',
                true
            );
        }
    });
    
    panel.onDidDispose((e) => {
        Logger.debug(`Dashboard Disposed`);
        enabled = false;
        vscode.commands.executeCommand(
            'setContext',
            'nvim-dashboard:enabled',
            false
        );
    });

    return panel;
}

/**
 * Saves the current workspace to the context
 * @param context {vscode.ExtensionContext} - The context of the extension
 */
function saveWorkspaceToState(context: vscode.ExtensionContext) {
    const homeDirectory = os.homedir();
    const workspace = vscode.workspace.workspaceFolders?.map((folder) =>
        folder.uri.fsPath.replace(homeDirectory, '~')
    );
    if (!workspace || workspace.length === 0) {
        return;
    }

    Logger.info(`Saving ${workspace[0]} to global state.`);
    const firstFolder = workspace[0];
    const oldWorkspace = context.globalState.get('workspace', []);
    const filteredWorkspaces = oldWorkspace.filter((f) => f !== firstFolder);
    const updatedWorkspace = [...filteredWorkspaces, firstFolder].reverse();
    context.globalState.update('workspace', updatedWorkspace);
}

function saveFileToState(context: vscode.ExtensionContext, file: string) {
    const newFile = condenseHomeDir(file);
    if (!newFile) {
        return;
    }

    Logger.info(`Saving ${newFile} to global state`);
    const oldFiles = context.globalState.get('files', []);
    const filteredFiles = oldFiles.filter((f) => f !== newFile);
    const updatedFiles = [...filteredFiles, newFile].reverse().slice(0,26);
    context.globalState.update('files', updatedFiles);
}

function sendInformationtoFrontEnd(
    context: vscode.ExtensionContext,
    panel: vscode.WebviewPanel
) {
    // Get the recent workspaces and files
    const workspaces = context.globalState.get('workspace', []);
    const files = context.globalState.get('files', []);

    // Get current list of taken keybinds
    const keybindKeys = Object.keys(keybinds);

    // Create a new keybind for each of the workspaces
    workspaceKeybinds = new Map()
    ;[...workspaces].slice(0, workspaceLimit).forEach((workspace: string) => {
        const name: string | undefined = workspace.split('/').pop();
        const nameLetters = name?.split('');
        for (const letter of nameLetters || []) {
            if (!keybindKeys.includes(letter)) {
                workspaceKeybinds.set(letter, workspace);
                keybindKeys.push(letter);
                break;
            }
        }
    });

    // Create a new keybind for each of the workspaces
    fileKeybinds = new Map()
    ;[...files].slice(0, filesLimit).forEach((file: string) => {
        const name: string | undefined = file.split('/').pop();
        const nameLetters = name?.split('');
        for (const letter of nameLetters || []) {
            if (!keybindKeys.includes(letter)) {
                fileKeybinds.set(letter, file);
                keybindKeys.push(letter);
                break;
            }
        }
    });

    // Pose the message to the webview panel
    panel.webview.postMessage({
        command: 'sendWorkspaces',
        workspaces: Array.from(workspaceKeybinds),
        files: Array.from(fileKeybinds),
        keybinds: keybindsConfig,
        showDateTime: showDateTime,
        logoFont: logoFont,
        logoText: logoText,
        bottomText: bottomText,
    });
}

function getCommand(letter: string): string | undefined {
    const command = keybinds[letter];
    if (keybinds[letter]) {
        return keybinds[letter];
    } else if (workspaceKeybinds.has(letter)) {
        return 'openWorkspace';
    } else if (fileKeybinds.has(letter)) {
        return 'openFile';
    }
}

let enabled = false;

/**
 * @param {vscode.ExtensionContext} context
 */
export function activate(context: vscode.ExtensionContext) {
    Logger.info('Activating extension');
    let dashboard: vscode.WebviewPanel;
    saveWorkspaceToState(context);
    const activeFile = vscode.window.activeTextEditor?.document.fileName;
    activeFile ? saveFileToState(context, activeFile) : null;

    // Create a listener for active text editor changes to log recent files to global state
    vscode.window.onDidChangeActiveTextEditor((e) => {
        if (e) {
            saveFileToState(context, e.document.fileName);
        }
    });

    // Register commands
    let commandShowWelcome = vscode.commands.registerCommand(
        'nvim-dashboard.open',
        function () {
            Logger.info('Command nvim-dashboard.open called');
            if (!enabled) {
                enabled = true;
                vscode.commands.executeCommand(
                    'setContext',
                    'nvim-dashboard:enabled',
                    true
                );
                dashboard = showWelcomePage(context);
            }
        }
    );
    Logger.info('Registering command nvim-dashboard.open');
    context.subscriptions.push(commandShowWelcome);

    let commandHandleKey = vscode.commands.registerCommand(
        'nvim-dashboard.handleKey',
        function ({ text: letter }: { text: string }) {
            Logger.info(
                `Command nvim-dashboard.handleKey called with letter: ${letter}`
            );
            if (!enabled) {
                return;
            }
            const command = getCommand(letter);
            if (command) {
                if (command === 'nvim-dashboard.close') {
                    dashboard.dispose();
                    return;
                } else if (command === 'openWorkspace') {
                    if (workspaceKeybinds.get(letter)) {
                        const workspacePath = workspaceKeybinds.get(letter);
                        if (workspacePath) {
                            openWorkspace(workspacePath);
                        }
                    }
                } else if (command === 'openFile') {
                    if (fileKeybinds.get(letter)) {
                        const filePath = fileKeybinds.get(letter);
                        if (filePath) {
                            openFile(filePath);
                            dashboard.dispose();    // close the dashboard
                        }
                    }
                } else {
                    vscode.commands.executeCommand(command);
                }
            }
        }
    );
    Logger.info('Registering command nvim-dashboard.handleKey');
    context.subscriptions.push(commandHandleKey);

    let commandClearRecentWorkspaces = vscode.commands.registerCommand(
        'nvim-dashboard.clearRecentWorkspaces',
        function () {
            Logger.info('Command nvim-dashboard.clearRecentWorkspaces called');
            clearRecentWorkspaces(context);
        }
    );
    Logger.info('Registering command nvim-dashboard.clearRecentWorkspaces');
    context.subscriptions.push(commandClearRecentWorkspaces);

    let commandClearRecentFiles = vscode.commands.registerCommand(
        'nvim-dashboard.clearRecentFiles',
        function () {
            Logger.info('Command nvim-dashboard.clearRecentFiles called');
            clearRecentFiles(context);
        }
    );
    Logger.info('Registering command nvim-dashboard.clearRecentFiles');
    context.subscriptions.push(commandClearRecentFiles);

    const hasOpenWorkspace =
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0;
    Logger.info(`Has open workspace: ${hasOpenWorkspace}`);

    if (hasOpenWorkspace) {
        Logger.info('Not enabling dashboard due to open workspace');
        enabled = false;
        vscode.commands.executeCommand(
            'setContext',
            'nvim-dashboard:enabled',
            false
        );
        return;
    }

    // Build the webpanel
    Logger.info('Enabling dashboard');
    dashboard = showWelcomePage(context);
    vscode.commands.executeCommand('setContext', 'nvim-dashboard:enabled', true);
    enabled = true;
}

// Deconstructor
export function deactivate() {
    Logger.info('Deactivating extension');
    enabled = false;
    vscode.commands.executeCommand(
        'setContext',
        'nvim-dashboard:enabled',
        false
    );
}
