import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'getting-started',
    {
      type: 'category',
      label: 'Guide',
      items: ['guide/state', 'guide/mappings', 'guide/rows', 'guide/keyboard', 'guide/styling', 'guide/headless'],
    },
    {
      type: 'category',
      label: 'API reference',
      items: ['api/table-mapping', 'api/ref', 'api/headless', 'api/types'],
    },
    'changelog',
  ],
};

export default sidebars;
