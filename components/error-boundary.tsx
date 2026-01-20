'use client'

import React from 'react'
import { toast } from 'sonner'

type Props = {
	children: React.ReactNode
  fallback?: React.ReactNode
}

type State = { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false }
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error('ClientErrorBoundary', { error, errorInfo })
		toast.error('Ocorreu um erro inesperado. Tente novamente.')
	}

	handleRetry = () => {
		this.setState({ hasError: false, error: undefined })
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex min-h-[40vh] items-center justify-center">
					<div className="max-w-md text-center space-y-3">
						<h2 className="text-xl font-semibold">Algo deu errado</h2>
						<p className="text-sm text-muted-foreground">
							Tente novamente. Se persistir, entre em contato com o suporte.
						</p>
						<button
							className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
							onClick={this.handleRetry}
						>
							Tentar novamente
						</button>
					</div>
				</div>
			)
		}
		return this.props.children
	}
}


