/**
 * The Obsidian plugin — engram's human surface inside the editor.
 *
 * §11 lists this surface as serving "human, agent inside the editor". The agent
 * half is already served: an agent working in this vault reaches the operations
 * over MCP (Phase 15). **This is the human half**, and its centrepiece is the
 * approval queue — the one place `propose-only`'s deferral can actually be
 * resolved, alongside the CLI and nowhere else (ADR-0042).
 *
 * Everything below is shell. The work lives in `commands.ts`, which knows nothing
 * about Obsidian and is tested without it; this file wires `app.vault.adapter` to
 * a `FileStore` and turns returned strings into `Notice`s.
 *
 * `recall` is absent on purpose — it is Phase 11 and gated on Gate 2. Skills are
 * absent too: a skill is instructions for an agent to follow, engram ships no
 * agent, and an agent in this vault already reaches them over MCP.
 */

import { ItemView, Notice, Plugin, type WorkspaceLeaf } from 'obsidian';
import { renderDiff } from '../src/surface/diff.js';
import { obsidianFileStore, type VaultAdapter } from '../src/substrate/obsidian.js';
import { systemClock } from '../src/substrate/clock.js';
import {
  approveCommand,
  captureCommand,
  formatCommand,
  pendingQueue,
  rejectCommand,
  type EngramDeps,
  type QueueItem,
} from './commands.js';

export const QUEUE_VIEW = 'engram-queue';

export default class EngramPlugin extends Plugin {
  private deps(): EngramDeps {
    return {
      // The payoff of ADR-0032's ports: `nodeFileStore` cannot run here — mobile
      // has no `node:fs` — and every operation above this line is unchanged.
      files: obsidianFileStore(this.app.vault.adapter as unknown as VaultAdapter),
      clock: systemClock(),
      by: 'human',
    };
  }

  private async run(work: Promise<string>): Promise<void> {
    try {
      new Notice(await work);
    } catch (e) {
      new Notice(`engram: ${e instanceof Error ? e.message : String(e)}`);
    }
    this.refreshQueue();
  }

  override async onload(): Promise<void> {
    this.registerView(QUEUE_VIEW, (leaf) => new QueueView(leaf, this));

    this.addRibbonIcon('inbox', 'Engram: proposals awaiting review', () => {
      void this.openQueue();
    });

    this.addCommand({
      id: 'engram-capture',
      name: 'Capture selection to raw/',
      editorCallback: (editor) => {
        const text = editor.getSelection() || editor.getValue();
        void this.run(captureCommand(text, this.deps()));
      },
    });

    this.addCommand({
      id: 'engram-format',
      name: 'Format note into a validated node',
      editorCallback: (editor, view) => {
        const text = editor.getValue();
        // The agent supplies structure; here the human does, and the file they are
        // in is the strongest hint available. Engram still infers nothing.
        const title = view.file?.basename;
        void this.run(formatCommand(text, title === undefined ? {} : { title }, this.deps()));
      },
    });

    this.addCommand({
      id: 'engram-queue',
      name: 'Open the approval queue',
      callback: () => void this.openQueue(),
    });
  }

  async openQueue(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(QUEUE_VIEW);
    if (existing.length > 0) {
      await this.app.workspace.revealLeaf(existing[0]!);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf === null) return;
    await leaf.setViewState({ type: QUEUE_VIEW, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  refreshQueue(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(QUEUE_VIEW)) {
      const view = leaf.view;
      if (view instanceof QueueView) void view.render();
    }
  }

  approve(id: string): void {
    void this.run(approveCommand(id, this.deps()));
  }

  reject(id: string, note: string): void {
    void this.run(rejectCommand(id, note, this.deps()));
  }

  pending(): Promise<QueueItem[]> {
    return pendingQueue(this.deps());
  }
}

/**
 * The approval queue panel.
 *
 * Same objects the CLI reads, rendered differently — which is §11's own test that
 * the tiering is real rather than decorative. Nothing here decides anything; the
 * gate already did.
 */
class QueueView extends ItemView {
  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: EngramPlugin,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return QUEUE_VIEW;
  }

  getDisplayText(): string {
    return 'Engram — approval queue';
  }

  getIcon(): string {
    return 'inbox';
  }

  override async onOpen(): Promise<void> {
    await this.render();
  }

  async render(): Promise<void> {
    const root = this.contentEl;
    root.empty();
    root.createEl('h4', { text: 'Awaiting your review' });

    const items = await this.plugin.pending();
    if (items.length === 0) {
      root.createEl('p', {
        text: 'Nothing pending. Changes an agent makes in a propose-only path appear here.',
      });
      return;
    }

    for (const item of items) {
      const card = root.createDiv({ cls: 'engram-proposal' });
      card.createEl('strong', { text: item.proposal.target });
      card.createEl('div', {
        text: `held by ${item.proposal.rule} · ${item.proposal.by} · ${item.proposal.at}`,
        cls: 'engram-proposal-meta',
      });

      if (item.stale) {
        // The panel says so before the click, rather than letting approve fail.
        card.createEl('div', {
          text: '⚠ This file changed since the proposal was made. Approve will refuse — engram does not merge.',
          cls: 'engram-proposal-stale',
        });
      }

      card.createEl('pre', { text: renderDiff(item.current ?? '', item.proposal.content) });

      const actions = card.createDiv({ cls: 'engram-proposal-actions' });
      const approveBtn = actions.createEl('button', { text: 'Approve' });
      approveBtn.disabled = item.stale;
      approveBtn.onclick = () => this.plugin.approve(item.proposal.id);

      const rejectBtn = actions.createEl('button', { text: 'Reject' });
      rejectBtn.onclick = () => this.plugin.reject(item.proposal.id, 'rejected in Obsidian');
    }
  }
}
