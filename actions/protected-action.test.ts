// @vitest-environment node
import { describe, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import * as ts from 'typescript';

type ActionEntry = {
  name: string;
  node: ts.ArrowFunction | ts.FunctionDeclaration | ts.FunctionExpression;
};

const isExported = (node: ts.Node): boolean => {
  if (!ts.canHaveModifiers(node)) return false;
  const modifiers = ts.getModifiers(node);
  return Boolean(
    modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
  );
};

const getRequireProfileNames = (sourceFile: ts.SourceFile): Set<string> => {
  const names = new Set<string>();

  sourceFile.forEachChild((node) => {
    if (!ts.isImportDeclaration(node)) return;
    if (!ts.isStringLiteral(node.moduleSpecifier)) return;
    if (node.moduleSpecifier.text !== '@/lib/require-profile') return;

    const clause = node.importClause;
    if (!clause || !clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) {
      return;
    }

    for (const element of clause.namedBindings.elements) {
      if (element.name.text) {
        names.add(element.name.text);
      }
    }
  });

  return names;
};

const getExportedActions = (sourceFile: ts.SourceFile): ActionEntry[] => {
  const actions: ActionEntry[] = [];

  sourceFile.forEachChild((node) => {
    if (ts.isFunctionDeclaration(node) && node.name && isExported(node)) {
      actions.push({ name: node.name.text, node });
      return;
    }

    if (ts.isVariableStatement(node) && isExported(node)) {
      for (const declaration of node.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !declaration.initializer) {
          continue;
        }

        if (
          ts.isArrowFunction(declaration.initializer) ||
          ts.isFunctionExpression(declaration.initializer)
        ) {
          actions.push({ name: declaration.name.text, node: declaration.initializer });
        }
      }
    }
  });

  return actions;
};

const hasRequireProfileCall = (
  fn: ActionEntry['node'],
  requireProfileNames: Set<string>
): boolean => {
  let found = false;
  const body = fn.body;
  if (!body) return false;

  const visit = (node: ts.Node) => {
    if (found) return;
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (requireProfileNames.has(node.expression.text)) {
        found = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };

  ts.forEachChild(body, visit);
  return found;
};

describe('server actions', () => {
  it('use requireProfile in every exported action', async () => {
    const actionsDir = path.dirname(fileURLToPath(import.meta.url));
    const entries = await readdir(actionsDir);
    const actionFiles = entries.filter(
      (file) => file.endsWith('.ts') && !file.endsWith('.test.ts')
    );

    for (const file of actionFiles) {
      const filePath = path.join(actionsDir, file);
      const content = await readFile(filePath, 'utf8');
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      const requireProfileNames = getRequireProfileNames(sourceFile);
      const actions = getExportedActions(sourceFile);

      if (actions.length === 0) continue;
      if (requireProfileNames.size === 0) {
        throw new Error(`${file} is missing a requireProfile import`);
      }

      for (const action of actions) {
        if (!hasRequireProfileCall(action.node, requireProfileNames)) {
          throw new Error(
            `${file} export "${action.name}" is missing requireProfile()`
          );
        }
      }
    }
  });
});
