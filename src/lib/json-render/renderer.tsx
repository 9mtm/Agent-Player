'use client';

import { SpecRenderer as BaseRenderer } from '@/lib/ui-web4/react';
import type { Spec } from '@/lib/ui-web4/core';
import { registry } from './registry';

interface SpecRendererProps {
  spec: Spec;
  loading?: boolean;
}

export function SpecRenderer({ spec, loading }: SpecRendererProps) {
  if (!spec || !spec.root) return null;
  return <BaseRenderer spec={spec} registry={registry} loading={loading} />;
}
