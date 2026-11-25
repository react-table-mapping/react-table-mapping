import BrowserOnly from '@docusaurus/BrowserOnly';
import CodeBlock from '@theme/CodeBlock';
import {useEffect, useState, type ComponentType} from 'react';
import styles from './Demo.module.css';
import {useLibraryTheme} from './useLibraryTheme';

const frameClass = `${styles.frame} rtm-demo`;

function Mounted({component: Component}: {component: ComponentType}) {
  const [ready, setReady] = useState(false);
  const theme = useLibraryTheme();
  useEffect(() => setReady(true), []);
  return (
    <div className={theme ? `${frameClass} ${theme}` : frameClass} data-demo-ready={ready ? '' : undefined}>
      <Component />
    </div>
  );
}

/** A live demo and, under it, the file it runs — one source for both. */
export default function Demo({component, source}: {component: ComponentType; source: string}) {
  return (
    <>
      <BrowserOnly fallback={<div className={styles.frame} />}>{() => <Mounted component={component} />}</BrowserOnly>
      <CodeBlock language="tsx">{source}</CodeBlock>
    </>
  );
}
