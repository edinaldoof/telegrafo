'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth/context'
import {
  LayoutDashboard,
  Settings,
  Users,
  MessageSquare,
  History,
  List,
  Smartphone,
  Menu,
  X,
  Send,
  FileText,
  Calendar,
  Tags,
  ChevronRight,
  LogOut,
  User,
  Activity,
} from 'lucide-react'

const navigation = [
  {
    section: 'Principal',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard, badge: null },
      { name: 'Instâncias', href: '/instances', icon: Smartphone, badge: 'novo' },
    ]
  },
  {
    section: 'Mensageria',
    items: [
      { name: 'Enviar Mensagens', href: '/enviar', icon: Send, badge: null },
      { name: 'Templates', href: '/templates', icon: FileText, badge: null },
      { name: 'Agendamentos', href: '/agendamentos', icon: Calendar, badge: null },
      { name: 'Histórico', href: '/historico', icon: History, badge: null },
    ]
  },
  {
    section: 'Gerenciamento',
    items: [
      { name: 'Grupos', href: '/grupos', icon: List, badge: null },
      { name: 'Contatos', href: '/contatos', icon: Users, badge: null },
      { name: 'Tags', href: '/tags', icon: Tags, badge: null },
    ]
  },
  {
    section: 'Sistema',
    items: [
      { name: 'Atividades', href: '/atividades', icon: Activity, badge: null },
      { name: 'Configurações', href: '/configuracoes', icon: Settings, badge: null },
    ]
  }
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['Principal', 'Mensageria', 'Gerenciamento'])

  // Fecha o menu quando a rota muda
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Previne scroll do body quando menu está aberto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  return (
    <>
      {/* Mobile Menu Button - Fixo no topo com melhor visibilidade */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-black border-b border-gray-800 shadow-lg z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2.5 rounded-lg bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg active:scale-95 transition-all"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-white" />
            ) : (
              <Menu className="h-6 w-6 text-white" />
            )}
          </button>
          <div className="flex items-center">
            <div className="p-1.5 rounded-lg bg-gradient-to-r from-primary to-accent shadow-sm">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <span className="ml-2 text-base font-bold text-gray-100">Telegrafo</span>
          </div>
        </div>
      </div>

      {/* Overlay - Apenas em mobile quando menu aberto */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static top-16 lg:top-0 bottom-0 left-0 z-50 lg:z-auto
          w-80 lg:w-72 lg:flex-shrink-0
          bg-zinc-950 border-r border-gray-800 shadow-2xl lg:shadow-none
          flex flex-col
          transform transition-all duration-300 ease-out
          ${isMobileMenuOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100'}
        `}
      >
        {/* Logo - Apenas desktop */}
        <div className="hidden lg:flex h-20 items-center px-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
              <MessageSquare className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-100">Telegrafo</h1>
              <p className="text-xs text-gray-400">Sem código Morse necessário</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-6">
            {navigation.map((section) => {
              const isExpanded = expandedSections.includes(section.section)

              return (
                <div key={section.section}>
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section.section)}
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    <span>{section.section}</span>
                    <ChevronRight
                      className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    />
                  </button>

                  {/* Section Items */}
                  {isExpanded && (
                    <div className="mt-2 space-y-1 animate-slide-in">
                      {section.items.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon

                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            className={`
                              group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all active:scale-[0.98]
                              ${
                                isActive
                                  ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/20'
                                  : 'text-gray-300 hover:bg-primary/10 hover:text-primary'
                              }
                            `}
                          >
                            <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'}`} />
                            <span className="flex-1">{item.name}</span>
                            {item.badge && (
                              <span className={`
                                px-2 py-0.5 text-xs font-semibold rounded-full
                                ${item.badge === 'novo'
                                  ? 'bg-green-500 text-white'
                                  : item.badge === 'em breve'
                                  ? 'bg-gray-500 text-white'
                                  : 'bg-blue-500 text-white'
                                }
                              `}>
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </nav>

        {/* Footer with User Info */}
        <div className="border-t border-gray-800 p-4">
          {user && (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-gray-800">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{user.id}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="text-center">
            <p className="text-xs text-gray-500">v1.0.0</p>
          </div>
        </div>
      </aside>
    </>
  )
}