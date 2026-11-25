import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'React Table Mapping',
  tagline: 'Drag-and-drop field mapping for React',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  stylesheets: [
    'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css',
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap',
  ],

  // GitHub Pages project site for github.com/react-table-mapping/react-table-mapping.
  url: 'https://react-table-mapping.github.io',
  baseUrl: '/react-table-mapping/',
  organizationName: 'react-table-mapping',
  projectName: 'react-table-mapping',
  trailingSlash: false,

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'ko'],
    localeConfigs: {
      en: {label: 'English', htmlLang: 'en'},
      ko: {label: '한국어', htmlLang: 'ko'},
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: ['./plugins/single-react.ts'],

  themeConfig: {
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'React Table Mapping',
      items: [
        {type: 'docSidebar', sidebarId: 'docsSidebar', position: 'left', label: 'Docs'},
        {type: 'doc', docId: 'api/table-mapping', position: 'left', label: 'API'},
        {type: 'doc', docId: 'changelog', position: 'left', label: 'Changelog'},
        {type: 'localeDropdown', position: 'right'},
        {
          href: 'https://github.com/react-table-mapping/react-table-mapping',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [{label: 'Getting started', to: '/docs/getting-started'}],
        },
        {
          title: 'More',
          items: [
            {label: 'Changelog', to: '/docs/changelog'},
            {label: 'GitHub', href: 'https://github.com/react-table-mapping/react-table-mapping'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} react-table-mapping. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
