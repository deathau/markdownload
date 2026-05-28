// Turndown checks `typeof window` to find DOMParser; in a SW window is absent
// but DOMParser IS available on self, so alias it.
if (typeof window === 'undefined') self.window = self;

importScripts(
  '../browser-polyfill.min.js',
  'apache-mime-types.js',
  'moment.min.js',
  'turndown.js',
  'turndown-plugin-gfm.js',
  '../shared/context-menus.js',
  '../shared/default-options.js',
  'background.js'
);
