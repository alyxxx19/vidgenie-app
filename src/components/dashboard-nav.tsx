'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FolderOpen,
  Library,
  BarChart3,
  CreditCard,
  Settings,
  HelpCircle,
  Plus,
  Calendar,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navigation = [
  {
    name: 'Tableau de bord',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Projets',
    href: '/projects',
    icon: FolderOpen,
  },
  {
    name: 'Bibliothèque',
    href: '/library',
    icon: Library,
  },
  {
    name: 'Calendrier',
    href: '/calendar',
    icon: Calendar,
  },
  {
    name: 'Équipe',
    href: '/team',
    icon: Users,
  },
  {
    name: 'Analytiques',
    href: '/analytics',
    icon: BarChart3,
  },
  {
    name: 'Facturation',
    href: '/account/billing',
    icon: CreditCard,
  },
  {
    name: 'Paramètres',
    href: '/settings',
    icon: Settings,
  },
  {
    name: 'Aide',
    href: '/help',
    icon: HelpCircle,
  },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-full">
      <div className="flex flex-col h-full">
        {/* Logo / Brand */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">VidGenie</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Créateur de contenu IA</p>
        </div>

        {/* Quick Actions */}
        <div className="p-4">
          <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <Link href="/create">
              <Plus className="w-4 h-4 mr-2" />
              Créer du contenu
            </Link>
          </Button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto">
          <ul className="px-3 py-2 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* User Info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-700" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                Utilisateur
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Plan gratuit
              </p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}