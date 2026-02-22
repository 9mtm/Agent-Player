'use client';

import type React from 'react';
import type { CatalogDef } from '../core/types';

export type ComponentRenderer<P = Record<string, unknown>> = (params: {
  props: P;
  children: React.ReactNode;
  emit: (event: string, payload?: unknown) => void;
}) => React.ReactElement | null;

export type Registry = Record<string, ComponentRenderer>;

export function defineRegistry(
  _catalog: CatalogDef,
  def: { components: Record<string, ComponentRenderer> },
): { registry: Registry } {
  return { registry: def.components };
}
