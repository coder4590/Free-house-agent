'use client';

import React from 'react';
import { KDSProvider } from '@/lib/kdsContext';
import { DeliveryProvider } from '@/lib/deliveryContext';
import { OwnerConfigProvider } from '@/lib/ownerConfigContext';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OwnerConfigProvider>
      <KDSProvider>
        <DeliveryProvider>
          {children}
        </DeliveryProvider>
      </KDSProvider>
    </OwnerConfigProvider>
  );
}

