'use client';

import React from 'react';
import { VoidProvider } from './VoidContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <VoidProvider>{children}</VoidProvider>;
}
