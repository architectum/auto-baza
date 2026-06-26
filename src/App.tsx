/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Outlet, ScrollRestoration } from 'react-router-dom';
import { AuthLayer } from '@features/auth/AuthLayer';

export default function App() {
  return (
    <AuthLayer>
      <div className="min-h-dvh" style={{ background: 'var(--t-surface-bg)', color: 'var(--t-text-primary)' }}>
        <Outlet />
        <ScrollRestoration />
      </div>
    </AuthLayer>
  );
}
