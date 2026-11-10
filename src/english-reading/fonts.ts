// Deterministic font loading: bundled variable TTFs under public/fonts
// (Latin + Simplified Chinese). Loading happens once per bundle load and
// blocks rendering until the faces are ready (handled by @remotion/fonts).

import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

let loadStarted = false;

export const ensureFontsLoaded = (): void => {
  if (loadStarted) {
    return;
  }
  loadStarted = true;
  loadFont({
    family: 'ERFredoka',
    url: staticFile('fonts/english-reading/Fredoka.ttf'),
    weight: '300 700',
  });
  loadFont({
    family: 'ERMontserrat',
    url: staticFile('fonts/english-reading/Montserrat.ttf'),
    weight: '100 900',
  });
  loadFont({
    family: 'ERNotoSansSC',
    url: staticFile('fonts/english-reading/NotoSansSC.ttf'),
    weight: '100 900',
  });
};
