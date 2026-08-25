import {
  ClipboardCheck,
  FileBarChart,
  LayoutDashboard,
  Stethoscope,
  Store,
  Warehouse,
} from 'lucide-react'
import { type SidebarData } from '../types'

// TODO: replace with the real logged-in user once Django session auth is wired up.
export const sidebarData: SidebarData = {
  user: {
    name: 'Администратор',
    email: 'admin@solgar.ru',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [],
  navGroups: [
    {
      title: 'Меню',
      items: [
        {
          title: 'Главная',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: '1C - Склад',
          url: '/onec-stock',
          icon: Warehouse,
        },
        {
          title: 'Аптеки',
          url: '/pharmacies',
          icon: Store,
        },
        {
          title: 'Врачи',
          url: '/doctors',
          icon: Stethoscope,
        },
        {
          title: 'Отчёты',
          url: '/reports',
          icon: FileBarChart,
        },
        {
          title: 'Согласования',
          url: '/tasks',
          icon: ClipboardCheck,
        },
      ],
    },
  ],
}
