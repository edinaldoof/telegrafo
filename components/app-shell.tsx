'use client'

import React from 'react'
import { ErrorBoundary } from '@/components/error-boundary'

export function AppShell({ children }: { children: React.ReactNode }) {
	return <ErrorBoundary>{children}</ErrorBoundary>
}


