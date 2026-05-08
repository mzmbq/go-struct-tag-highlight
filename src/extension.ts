import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  let decorationType: vscode.TextEditorDecorationType | undefined;

  function getColorSetting(): string {
    return vscode.workspace
      .getConfiguration()
      .get<string>("goStructTagHighlight.color", "#e5c07b");
  }

  function createDecorationType(): vscode.TextEditorDecorationType {
    return vscode.window.createTextEditorDecorationType({
      color: getColorSetting(),
      // backgroundColor: "#282C34",
    });
  }

  function disposeDecorationType() {
    if (decorationType) {
      decorationType.dispose();
    }
  }

  function updateDecorationType() {
    disposeDecorationType();
    decorationType = createDecorationType();
  }

  async function updateDecorations(editor: vscode.TextEditor | undefined) {
    if (!editor || !decorationType) {
      return;
    }
    const document = editor.document;
    const ranges: vscode.Range[] = [];
    if (document.languageId === "go") {
      const text = document.getText();
      const tagBlockRegex = /`([^`\n\r]+)`/g;
      let tagBlockMatch;
      while ((tagBlockMatch = tagBlockRegex.exec(text)) !== null) {
        // Find the start of the line for this tag block
        const blockAbsoluteStart = tagBlockMatch.index;
        const lineStart = text.lastIndexOf("\n", blockAbsoluteStart - 1) + 1;
        const line = text.slice(lineStart, blockAbsoluteStart);
        // If // appears before the backtick on this line, skip this block
        const commentIdx = line.indexOf("//");
        if (commentIdx !== -1 && commentIdx < blockAbsoluteStart - lineStart) {
          continue;
        }
        const blockStart = blockAbsoluteStart + 1;
        const blockText = tagBlockMatch[1];
        const labelRegex = /(\w+):"/g;
        let labelMatch;
        while ((labelMatch = labelRegex.exec(blockText)) !== null) {
          const labelOffset = blockStart + labelMatch.index;
          const labelStart = labelOffset;
          const labelEnd = labelOffset + labelMatch[1].length;
          const startPos = document.positionAt(labelStart);
          const endPos = document.positionAt(labelEnd);
          ranges.push(new vscode.Range(startPos, endPos));
        }
      }
    }
    editor.setDecorations(decorationType, ranges);
  }

  vscode.workspace.onDidChangeConfiguration(
    (event) => {
      if (event.affectsConfiguration("goStructTagHighlight.color")) {
        updateDecorationType();
        vscode.window.visibleTextEditors.forEach(updateDecorations);
      }
    },
    null,
    context.subscriptions,
  );

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      updateDecorations(editor);
    },
    null,
    context.subscriptions,
  );
  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document) {
        updateDecorations(editor);
      }
    },
    null,
    context.subscriptions,
  );

  updateDecorationType();
  if (vscode.window.activeTextEditor) {
    updateDecorations(vscode.window.activeTextEditor);
  }
}

export function deactivate() {}
