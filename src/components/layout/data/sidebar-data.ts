import {
  Award,
  BarChart,
  Building,
  Building2,
  ClipboardList,
  Database,
  FileBarChart,
  Globe,
  HelpCircle,
  LayoutDashboard,
  Link2,
  LineChart,
  MessageCircle,
  Package,
  PieChart,
  Presentation,
  Settings2,
  Stethoscope,
  Store,
  Table2,
  TrendingUp,
  Truck,
  Upload,
  Users,
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
          title: 'Организация',
          icon: Building,
          items: [
            {
              title: 'Сотрудники',
              url: '/employees',
              icon: Users,
            },
          ],
        },
        {
          title: 'Solgar Intern',
          icon: Package,
          items: [
            {
              title: 'Продаж&Сток',
              icon: FileBarChart,
              items: [
                {
                  title: 'Аптечной Сети Ввод Продаж&Сток',
                  url: '/sales-upload',
                  icon: Upload,
                },
                {
                  title: 'Аптечной Сети Просмотр Продаж&Сток',
                  url: '/chain-report',
                  icon: BarChart,
                },
                {
                  title: 'Дистрибьютор Ввод Продаж&Сток',
                  url: '/distributor-upload',
                  icon: Truck,
                },
                {
                  title: 'Дистрибьютор Просмотр Продаж&Сток',
                  url: '/sales-obs',
                  icon: TrendingUp,
                },
              ],
            },
            {
              title: 'Аптек&Врач',
              icon: Table2,
              items: [
                {
                  title: 'Аптек Управление Данными',
                  url: '/pharmacies',
                  icon: Store,
                },
                {
                  title: 'Врач Управление Данными',
                  url: '/doctors',
                  icon: Stethoscope,
                },
              ],
            },
            {
              title: 'Просмотр Отчетов',
              icon: Settings2,
              items: [
                {
                  title: 'Аптек Сводный Обзор',
                  url: '/pharm-managerial',
                  icon: Building2,
                },
                {
                  title: 'Врач Сводный Обзор',
                  url: '/doctor-managerial',
                  icon: ClipboardList,
                },
              ],
            },
          ],
        },
        {
          title: '1C',
          icon: Database,
          items: [
            {
              title: '1C - Склад',
              url: '/onec-stock',
              icon: Warehouse,
            },
          ],
        },
        {
          title: 'Аналитика',
          icon: PieChart,
          items: [
            {
              title: 'Аналитика 1C',
              url: '/analytics-1c',
              icon: LineChart,
            },
            {
              title: 'Power BI',
              icon: Presentation,
              items: [
                {
                  title: 'Solgar EN Online&Offline',
                  url: '/powerbi',
                  icon: Presentation,
                },
                {
                  title: 'Solgar Общий Обзор',
                  url: '/powerbi-obshiy',
                  icon: Globe,
                },
                {
                  title: "Nature's Bounty Общий Обзор",
                  url: '/powerbi-bounty',
                  icon: Award,
                },
              ],
            },
          ],
        },
        {
          title: 'HRlink',
          url: '/hrlink',
          icon: Link2,
        },
        {
          title: 'Битрикс24',
          url: '/bitrix24',
          icon: MessageCircle,
        },
        {
          title: 'FAQ',
          url: '/faq',
          icon: HelpCircle,
        },
      ],
    },
  ],
}
