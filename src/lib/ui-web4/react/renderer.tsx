'use client';

import React from 'react';
import type { Spec } from '../core/types';
import type { Registry } from './registry';

interface RendererProps {
  spec: Spec;
  registry: Registry;
  loading?: boolean;
}

function renderElement(
  id: string,
  spec: Spec,
  reg: Registry,
  emit: (event: string, payload?: unknown) => void,
): React.ReactNode {
  const element = spec.elements[id];
  if (!element) return null;

  const Component = reg[element.type];

  const childNodes = (element.children ?? []).map(childId =>
    renderElement(childId, spec, reg, emit),
  );

  if (!Component) {
    return (
      <div key={id} className="p-3 border border-dashed border-border rounded-lg text-xs text-muted-foreground">
        Unknown component: {element.type}
      </div>
    );
  }

  return (
    <React.Fragment key={id}>
      {Component({
        props: element.props as Record<string, unknown>,
        children: childNodes.length > 0 ? <>{childNodes}</> : null,
        emit,
      })}
    </React.Fragment>
  );
}

export function SpecRenderer({ spec, registry: reg, loading }: RendererProps) {
  if (!spec || !spec.root) return null;

  const emit = (event: string, payload?: unknown) => {
    // Event passthrough — components fire events; callers can extend if needed
    void event;
    void payload;
  };

  return (
    <div className="w-full">
      {renderElement(spec.root, spec, reg, emit)}
      {loading && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full w-1/3 animate-pulse rounded-full bg-primary/50" />
        </div>
      )}
    </div>
  );
}
