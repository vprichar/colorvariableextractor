const vscode = require('vscode');
function activate(context) {
  vscode.window.showInformationMessage('The ColorVariableExtractor extension is active.');

  let disposable = vscode.commands.registerCommand('colorvariableextractor.extractColorsToVariables', async () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      return;
    }

    const document = editor.document;
    const text = document.getText();
    const hexColorRegex = /(?<!\.|#)(#[A-Fa-f0-9]{6}|#[A-Fa-f0-9]{3})(?!\w)/g;
    const namedColorRegex = /(?<!\.|#|\w|\()(white|(?!white)(aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|yellow))(?!\w|\s*\)|\()/gi;

    const colorVariableMap = new Map();
    let match;
    let colorCounter = 1;


    while ((match = hexColorRegex.exec(text)) !== null) {
      const color = match[0];

      if (!colorVariableMap.has(color)) {
        const filename = document.fileName.replace(/^.*[\\\/]/, '').split('.').slice(0, -1).join('.');
        colorVariableMap.set(color, `--color-${filename}-${colorCounter}`);
        colorCounter++;
      }
    }
    while ((match = namedColorRegex.exec(text)) !== null) {
      const color = match[0].toLowerCase();
      if (!colorVariableMap.has(color)) {
        const filename = document.fileName.replace(/^.*[\\\/]/, '').split('.').slice(0, -1).join('.');
        colorVariableMap.set(color, `--color-${filename}-${colorCounter}`);
        colorCounter++;
      }
    }
    if (colorVariableMap.size === 0) {
      vscode.window.showInformationMessage('No se encontraron colores en el documento.');
      return;
    }

    const styleBlockRegex = /{[^}]*}/g;
    const styleBlocks = text.match(styleBlockRegex) || [];
    const updatedStyleBlocks = styleBlocks.map((styleBlock) => {
      const updatedBlock = styleBlock.replace(hexColorRegex, (match) => {
        const varName = colorVariableMap.get(match);
        return `var(${varName})`;
      }).replace(namedColorRegex, (match) => {
        const varName = colorVariableMap.get(match.toLowerCase());
        if (match.toLowerCase() === 'white') {
          return `var(--color-8)`;
        } else {
          return `var(${varName})`;
        }
      });
      return updatedBlock;
    });

    let updatedText = text;
    let i = 0;
    updatedText = updatedText.replace(styleBlockRegex, () => {
      const updatedBlock = updatedStyleBlocks[i];
      i++;
      return updatedBlock;
    });

    const variableDeclarations = Array.from(colorVariableMap.entries())
      .map(([color, variable]) => `  ${variable}: ${color};`)
      .join('\n');
    const cssVariableBlock = `:root {\n${variableDeclarations}\n}\n`;

    const finalText = cssVariableBlock + updatedText;
    const entireDocumentRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(text.length)
    );
    await editor.edit((editBuilder) => {
      editBuilder.replace(entireDocumentRange, finalText);
    });
    vscode.window.showInformationMessage('The ColorVariableExtractor extension is now active.');
  });

  context.subscriptions.push(disposable);
}
exports.activate = activate;