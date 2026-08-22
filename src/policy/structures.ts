/**
 * TIER 2 — Agency. The filing conventions a vault may declare.
 *
 * ADR-0023 says engram has **no opinion about the shape** and that the physical
 * tree is human-chosen and non-negotiable. That is still true — but "no opinion"
 * was mistaken for "say nothing", and saying nothing has a cost the design did not
 * intend: with no declared convention, two agents filing into the same vault
 * invent different containers. Four filings produced `concepts/`, `knowledge/` and
 * `notes/`, and on a case-sensitive filesystem a fourth.
 *
 * So a vault **declares** a structure and engram renders it into `AGENTS.md`,
 * where every agent reads it. Engram supplies no opinion about *which* one; it
 * only insists the vault has one, so filing is consistent. That is a contract,
 * not a preference.
 *
 * Adding a philosophy is adding an entry here. No code, no branch — the same
 * property the adapter registry has.
 */

/** One directory in a structure, and the question it answers. */
export interface Container {
  /** Directory name, used verbatim as the `--container` value. */
  name: string;
  /** What belongs here — rendered into AGENTS.md so an agent can decide. */
  holds: string;
}

export interface StructureDef {
  id: string;
  label: string;
  /** One line on who this suits. */
  suits: string;
  /**
   * Containers created at `init` and advertised to agents.
   *
   * Empty means **no convention** — the vault gets `raw/` and nothing else, and
   * AGENTS.md says the shape is yours to invent.
   */
  containers: Container[];
  /**
   * Prose specific to this philosophy. The rest of the guide is shared, so a new
   * structure cannot ship a guide missing the parts every vault needs.
   */
  preamble: string[];
}

/** Every vault gets this, whatever else it declares. */
export const RAW: Container = {
  name: 'raw',
  holds:
    'Unprocessed capture — pasted links, half thoughts, anything at all. Never ' +
    'filed by hand; `format` promotes it out of here when it is ready.',
};

const H = (title: string, structure: string): string[] => [
  `# ${title}`,
  '',
  `> How this vault is organised, and how to keep it organised as it grows.`,
  `> Structure: \`${structure}\`. Change it in \`.engram/config.json\`.`,
  '',
];

/** Shared closing sections — the same for every structure, so they cannot drift. */
const COMMON = (containers: Container[]): string[] => [
  '',
  '## The path a note takes',
  '',
  'Nothing is required to pass through `raw/`. It is a buffer, not a stage — but',
  'it is where most notes start, because capture never rejects and thinking is',
  'faster than filing.',
  '',
  '```',
  'a thought, a link, a paste',
  '        ↓  engram capture      (never rejects — nothing is lost)',
  '   raw/2026-08-22T14-03-11Z.md',
  '        ↓  engram format       (you or an agent decide title, container, relations)',
  `   ${containers[0]?.name ?? 'somewhere'}/the-idea.md      a validated node with frontmatter`,
  '        ↓  engram reindex',
  '   index.md + views/           regenerated projections',
  '```',
  '',
  '**Deciding where a formatted note belongs** is the one judgement engram will not',
  'make for you, because it makes no network call and runs no model. Ask, in order:',
  '',
  '1. **Is it about one specific thing you are doing?** Then it belongs with that',
  '   work, not with your reference material.',
  '2. **Would you look for it again in six months?** Then it is reference.',
  '3. **Is it a record of a choice, with a date attached?** Then it is a decision,',
  '   and it will one day be superseded rather than edited.',
  "4. **Is it someone else's material rather than your own thinking?** Then it is a",
  '   source, and anything you build on it should cite it.',
  '',
  'If two answers fit, pick either. The folder is an address, not the truth — the',
  'relations are the truth, and a note can belong to several containers at once.',
  '',
  '## Relations are what actually organise this',
  '',
  'A folder puts a note in exactly one place. Relations put it in as many as it',
  'belongs to, and they are what `index.md` and `views/` are built from.',
  '',
  '| Relation | Meaning | Use it when |',
  '|---|---|---|',
  '| `part-of` | this note belongs to that container or topic | filing, and grouping beyond folders |',
  '| `sources` | this note draws on that one as evidence | any claim built on something else |',
  '| `supersedes` | this note replaces that one | a decision changed; never edit the old one |',
  '',
  'A note may declare several `part-of` edges. `raft.md` can live in one folder and',
  'still appear under both `concepts` and `consensus` in the index — one file, no',
  'copies. That is how you get a second arrangement without moving anything.',
  '',
  '**Link generously in the body too.** Standard markdown links between notes are',
  'what make the vault navigable by clicking, in Obsidian or any editor. Engram',
  'never rewrites link targets (ADR-0028) — your editor owns that.',
  '',
  '## Growing without reorganising',
  '',
  'Two habits keep this scaling past a few hundred notes:',
  '',
  '- **Supersede, never overwrite.** When a decision changes, write a new note that',
  '  `supersedes` the old one. `views/superseded.md` then tells you what is stale —',
  '  something text search fundamentally cannot, because it returns the old note',
  '  with the same confidence as the new one.',
  '- **Cite when you synthesise.** A note whose id starts `synthesis-` must carry a',
  '  `sources` edge; engram refuses it otherwise. Six months on, that is the',
  '  difference between a claim you can check and one you have to take on faith.',
  '',
  '## When a folder gets crowded',
  '',
  'Add a subfolder, or add a new top-level one. **Nothing breaks.** The path is an',
  'address; the slug is the identity (ADR-0021), and moving a file keeps its id and',
  'records the old path in `aliases`. You are not locked into the structure you',
  'chose — it is a convention, and `doctor` reports drift rather than forbidding it.',
  '',
  '## Check on it',
  '',
  '```',
  'engram doctor      # dangling relations, uncited claims, stale link settings',
  'engram reindex     # rebuild index.md and views/ after any batch of edits',
  '```',
  '',
  'Everything in `views/` and `index.md` is generated and gitignored. Delete the',
  'lot and `reindex` rebuilds it byte for byte.',
];

const table = (containers: Container[]): string[] => [
  '## The directories',
  '',
  '| Directory | What belongs here |',
  '|---|---|',
  ...[RAW, ...containers].map((c) => `| \`${c.name}/\` | ${c.holds} |`),
];

export const STRUCTURES: StructureDef[] = [
  {
    id: 'default',
    label: 'Default',
    suits: 'most people, and a good starting point if you are unsure',
    containers: [
      {
        name: 'concepts',
        holds:
          'Evergreen understanding — an idea explained in your own words. Rewritten as ' +
          'you learn more, rarely superseded.',
      },
      {
        name: 'decisions',
        holds:
          'Choices you made, with the reasoning and the date. Never edited once made — ' +
          'a later decision `supersedes` an earlier one.',
      },
      {
        name: 'sources',
        holds:
          "Other people's material — papers, talks, articles, repos. What you cite " +
          'when you build on it.',
      },
      {
        name: 'projects',
        holds: 'Work with an end. Notes tied to one effort rather than to a topic.',
      },
    ],
    preamble: [
      'This splits notes by **what kind of thing they are**, which is the division',
      'that stays stable longest: a concept is still a concept in five years, and a',
      'decision is still a decision.',
      '',
      'It scales by subdividing rather than by adding top-level folders. A vault with',
      'three hundred concepts gets `concepts/distributed-systems/`, not a new sibling',
      'of `concepts/`. Keep the top level to these four and the vault stays legible',
      'from a terminal at any size.',
    ],
  },
  {
    id: 'para',
    label: 'PARA',
    suits: 'people who organise by actionability — what needs attention now, versus later',
    containers: [
      {
        name: '1-projects',
        holds: 'Active work with a deadline and a finish line. If it is done, it moves to archive.',
      },
      {
        name: '2-areas',
        holds:
          'Ongoing responsibility with no end date — health, a team you run, a system ' +
          'you maintain. Never "finished".',
      },
      {
        name: '3-resources',
        holds: 'Topics you care about but are not acting on. Reference material and reading.',
      },
      {
        name: '4-archive',
        holds: 'Inactive items from the other three. Nothing is deleted; it goes cold here.',
      },
    ],
    preamble: [
      'PARA splits notes by **how much attention they need**, not by subject. The',
      'numbering is deliberate — it sorts the folders by urgency in every file',
      'browser, so the things needing action are always at the top.',
      '',
      'The move that makes PARA work is the one people skip: **when a project ends,',
      'move it to `4-archive/`.** Nothing is deleted, and the top of the vault stays',
      'a picture of what is actually live. Moving a file is safe here — the slug is',
      'the identity, so relations survive and `aliases` records where it used to be.',
      '',
      'If you find yourself unsure between an area and a resource, ask whether you',
      'are *responsible* for it. You maintain areas; you merely read resources.',
    ],
  },
  {
    id: 'zettelkasten',
    label: 'Zettelkasten',
    suits: 'people who want structure to come entirely from links rather than folders',
    containers: [
      {
        name: 'notes',
        holds:
          'Every note, flat. One idea per note, small enough to state in a sentence. ' +
          'Structure comes from links and `part-of` edges, never from folders.',
      },
    ],
    preamble: [
      'There is one folder on purpose. In a Zettelkasten the folder carries no',
      'meaning at all — **the links are the structure**, and any hierarchy you want',
      'is expressed as a note that links to other notes.',
      '',
      'That makes `part-of` edges and generated views do the work folders do',
      'elsewhere. A "map of content" is simply a note whose body links to everything',
      'on a theme, and `index.md` groups by whatever `part-of` edges you author — so',
      'one note can sit under three themes without being copied.',
      '',
      'The discipline that makes this pay off: **one idea per note**, small enough to',
      'state in a sentence, and always linked to at least one neighbour on the way',
      'in. A note nobody linked is a note you will never find again —',
      '`views/orphans.md` is the list of them.',
    ],
  },
  {
    id: 'custom',
    label: 'Custom',
    suits: 'people who already have a shape in mind, or an existing vault to preserve',
    containers: [],
    preamble: [
      'You chose **custom**, so engram created `raw/` and nothing else. The shape is',
      'entirely yours, and `AGENTS.md` tells agents exactly that: file where the',
      'human tells you, and ask rather than invent a folder.',
      '',
      'This is the right choice for a vault that already has years of notes in it —',
      'there is nothing to migrate, because engram adds to your structure instead of',
      'replacing it.',
      '',
      '**Worth writing your own convention below.** Not because engram requires it,',
      'but because two agents filing into a vault with no stated convention will',
      'invent different folders for the same kind of note. A few lines here is all it',
      'takes to prevent that; edit this file freely, it is yours.',
    ],
  },
];

/**
 * The full guide for a structure: its own prose, its directories, then the
 * sections every vault needs. Built centrally so adding a philosophy cannot
 * accidentally ship a guide that omits how relations work.
 */
export function guideFor(def: StructureDef): string {
  return [
    ...H(`${def.label} — how this vault is organised`, def.id),
    ...def.preamble,
    '',
    ...table(def.containers),
    ...COMMON(def.containers),
    '',
  ].join('\n');
}

const BY_ID = new Map(STRUCTURES.map((s) => [s.id, s]));

export const structureIds = (): string[] => STRUCTURES.map((s) => s.id);
export const getStructure = (id: string): StructureDef | undefined => BY_ID.get(id);
