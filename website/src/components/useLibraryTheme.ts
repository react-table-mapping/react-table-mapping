import {useColorMode} from '@docusaurus/theme-common';

/**
 * The library switches theme on a `.dark` ancestor, the site on `data-theme` — this bridges the
 * two, so a board follows the site's light/dark toggle.
 */
export function useLibraryTheme(): string | undefined {
  const {colorMode} = useColorMode();
  return colorMode === 'dark' ? 'dark' : undefined;
}
