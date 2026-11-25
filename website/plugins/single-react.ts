import path from 'node:path';
import type {Plugin} from '@docusaurus/types';

// The library is linked from the sibling repo, which has its own node_modules. Without this its
// dist would import that React, and two Reacts on one page fail every hook.
export default function singleReact(): Plugin {
  const local = (name: string) => path.resolve(__dirname, '..', 'node_modules', name);
  return {
    name: 'single-react',
    configureWebpack() {
      return {
        resolve: {
          alias: {
            react: local('react'),
            'react-dom': local('react-dom'),
            '@radix-ui/react-select': local('@radix-ui/react-select'),
            '@radix-ui/react-slot': local('@radix-ui/react-slot'),
          },
        },
      };
    },
  };
}
