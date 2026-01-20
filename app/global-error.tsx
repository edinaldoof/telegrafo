'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
	useEffect(() => {
		console.error('GlobalError', error)
		toast.error('Erro inesperado. Tente novamente.')
	}, [error])

	return (
		<html lang="pt-BR">
			<body className="font-sans dark bg-background text-foreground min-h-screen">
				<div className="flex min-h-screen items-center justify-center">
					<div className="max-w-md text-center space-y-3">
						<h2 className="text-xl font-semibold">Ocorreu um erro</h2>
						<p className="text-sm text-muted-foreground">
							Tente novamente. Se o problema persistir, contate o suporte.
						</p>
						<button
							className="inline-flex items-center rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
							onClick={() => reset()}
						>
							Tentar novamente
						</button>
					</div>
				</div>
			</body>
		</html>
	)
}


