/**
 * Types for federation.mjs.
 *
 * The implementation is deliberately plain .mjs (see the note at the top of that
 * file: Vite may leave a bare workspace import external, and Node cannot import
 * TypeScript). Hand-written declarations give the vite configs full type safety
 * without making the runtime file itself TypeScript.
 */

export interface SharedDependencyConfig {
  singleton: boolean;
  requiredVersion: string;
}

export declare const SINGLETON_VERSIONS: Record<
  'react' | 'react-dom' | 'react-router-dom' | '@shop/ui',
  string
>;

/**
 * Returns the `shared` block for a Module Federation config, or `{}` when
 * MF_NO_SHARED=1 (used by the Phase 5 bundle measurement).
 */
export declare function sharedDeps(): Record<string, SharedDependencyConfig>;

export declare const REMOTE_PORTS: {
  shell: number;
  catalog: number;
  cart: number;
  account: number;
};
