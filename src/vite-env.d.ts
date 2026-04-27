/// <reference types="vite/client" />

import type { GlossaryResult, GlossaryStatus, SearchOptions } from "./types";

declare global {
  interface Window {
    glossaryApi: {
      getStatus: () => Promise<GlossaryStatus>;
      search: (query: string, options: SearchOptions) => Promise<GlossaryResult[]>;
      reindex: () => Promise<GlossaryStatus>;
      selectDirectory: () => Promise<GlossaryStatus>;
    };
  }
}

export {};
