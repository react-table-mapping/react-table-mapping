import type {ReactNode} from 'react';
import {useState} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';
import HeroBoard from '@site/src/components/HeroBoard';
import styles from './index.module.css';

const INSTALL = 'yarn add react-table-mapping';

const FIRST_BOARD = `import { TableMapping } from 'react-table-mapping';
import 'react-table-mapping/styles';

export function FieldMapper() {
  return (
    <TableMapping
      sourceColumns={[{ title: 'Source', key: 'name' }]}
      targetColumns={[{ title: 'Target', key: 'name' }]}
      sources={sources}
      targets={targets}
      mappings={mappings}
      onMappingChange={({ mappings }) => save(mappings)}
    />
  );
}`;

/** Small diagrams drawn in the board's own vocabulary: dots, and the lines between them. */
const glyphs = {
  connect: (
    <svg viewBox="0 0 48 28" aria-hidden>
      <circle cx="6" cy="6" r="3.5" />
      <circle cx="42" cy="22" r="3.5" />
      <path d="M10 6 C 24 6, 24 22, 38 22" fill="none" />
    </svg>
  ),
  state: (
    <svg viewBox="0 0 48 28" aria-hidden>
      <circle cx="6" cy="14" r="3.5" />
      <circle cx="42" cy="14" r="3.5" />
      <path d="M10 10 C 18 2, 30 2, 38 10" fill="none" />
      <path d="M38 18 C 30 26, 18 26, 10 18" fill="none" />
    </svg>
  ),
  a11y: (
    <svg viewBox="0 0 48 28" aria-hidden>
      <circle cx="6" cy="14" r="3.5" />
      <circle cx="42" cy="14" r="3.5" />
      <circle cx="42" cy="14" r="8" fill="none" />
      <path d="M10 14 H 30" fill="none" />
    </svg>
  ),
  headless: (
    <svg viewBox="0 0 48 28" aria-hidden>
      <rect x="2" y="3" width="44" height="22" rx="4" fill="none" strokeDasharray="3 3" />
      <circle cx="12" cy="14" r="3" />
      <circle cx="36" cy="14" r="3" />
      <path d="M15 14 H 33" fill="none" />
    </svg>
  ),
};

const features = [
  {
    id: 'connect',
    title: <Translate id="home.feature.connect.title">Drag, click or keyboard</Translate>,
    body: (
      <Translate id="home.feature.connect.body">
        Draw a line by dragging, by clicking one dot and then another, or with Enter and the arrow keys.
      </Translate>
    ),
  },
  {
    id: 'state',
    title: <Translate id="home.feature.state.title">Controlled or uncontrolled</Translate>,
    body: (
      <Translate id="home.feature.state.body">
        Feed every change back through onMappingChange, or pass initial values and read them through a ref.
      </Translate>
    ),
  },
  {
    id: 'a11y',
    title: <Translate id="home.feature.a11y.title">Built for the keyboard and screen readers</Translate>,
    body: (
      <Translate id="home.feature.a11y.body">
        Each region is one tab stop, every control has a name, and connections are announced.
      </Translate>
    ),
  },
  {
    id: 'headless',
    title: <Translate id="home.feature.headless.title">Headless when you need your own markup</Translate>,
    body: (
      <Translate id="home.feature.headless.body">
        react-table-mapping/headless gives you the same behaviour as prop getters for your own elements.
      </Translate>
    ),
  },
] as const;

function InstallCommand() {
  const [copied, setCopied] = useState(false);
  return (
    <div className={styles.install}>
      <code>
        <span className={styles.prompt} aria-hidden>
          $
        </span>
        {INSTALL}
      </code>
      <button
        type="button"
        className={styles.copy}
        onClick={() => {
          navigator.clipboard?.writeText(INSTALL).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}>
        {copied ? (
          <Translate id="home.install.copied">Copied</Translate>
        ) : (
          <Translate id="home.install.copy">Copy</Translate>
        )}
      </button>
    </div>
  );
}

export default function Home(): ReactNode {
  const boardLabel = translate({id: 'home.board.label', message: 'Example field mapping'});

  return (
    <Layout
      title={translate({id: 'home.layout.title', message: 'React Table Mapping'})}
      description={translate({
        id: 'home.layout.description',
        message: 'Drag-and-drop field mapping component for React',
      })}>
      <header className={styles.hero}>
        <div className={styles.intro}>
          <Heading as="h1" className={styles.title}>
            React Table Mapping
          </Heading>
          <p className={styles.lead}>
            <Translate id="home.lead">
              Draw the mapping between two lists of fields — by dragging, clicking or with the keyboard. One React
              component, or headless hooks for your own markup.
            </Translate>
          </p>
          <InstallCommand />
          <div className={styles.actions}>
            <Link className="button button--primary button--lg" to="/docs/getting-started">
              <Translate id="home.cta">Get started</Translate>
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/api/table-mapping">
              <Translate id="home.cta.api">API reference</Translate>
            </Link>
          </div>
        </div>

        <figure className={styles.stage}>
          <BrowserOnly fallback={<div className={styles.placeholder} />}>
            {() => <HeroBoard label={boardLabel} />}
          </BrowserOnly>
          <figcaption className={styles.caption}>
            <Translate id="home.board.caption">
              This board is live. Drag from a dot on the left to one on the right, or click a line to remove it.
            </Translate>
          </figcaption>
        </figure>
      </header>

      <main>
        <section className={styles.features}>
          {features.map((feature) => (
            <div key={feature.id} className={styles.feature}>
              <div className={styles.glyph}>{glyphs[feature.id]}</div>
              <Heading as="h3" className={styles.featureTitle}>
                {feature.title}
              </Heading>
              <p className={styles.featureBody}>{feature.body}</p>
            </div>
          ))}
        </section>

        <section className={styles.code}>
          <div>
            <Heading as="h2" className={styles.codeTitle}>
              <Translate id="home.code.title">A first board</Translate>
            </Heading>
            <p className={styles.codeBody}>
              <Translate id="home.code.body">
                Pass the two field lists, the lines between them and a change handler. Styles come from one import.
              </Translate>
            </p>
            <Link to="/docs/getting-started">
              <Translate id="home.code.link">Read the getting started guide</Translate>
            </Link>
          </div>
          <CodeBlock language="tsx">{FIRST_BOARD}</CodeBlock>
        </section>
      </main>
    </Layout>
  );
}
