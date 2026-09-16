import {
  BarChart,
  Building,
  Building2,
  ClipboardList,
  Database,
  FileBarChart,
  HelpCircle,
  LayoutDashboard,
  Link2,
  MessageCircle,
  Package,
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
              title: 'Отчет по продажам',
              icon: FileBarChart,
              items: [
                {
                  title: 'Аптечная сеть продаж',
                  url: '/chain-report',
                  icon: BarChart,
                },
                {
                  title: 'Просмотр Сток и Продажа',
                  url: '/sales-obs',
                  icon: TrendingUp,
                },
                {
                  title: 'Загрузка продаж',
                  url: '/sales-upload',
                  icon: Upload,
                },
                {
                  title: 'Дистрибьюторская нагрузка',
                  url: '/distributor-upload',
                  icon: Truck,
                },
              ],
            },
            {
              title: 'База данных',
              icon: Table2,
              items: [
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
              ],
            },
            {
              title: 'Административные экраны',
              icon: Settings2,
              items: [
                {
                  title: 'Экран администрирования аптек',
                  url: '/pharm-managerial',
                  icon: Building2,
                },
                {
                  title: 'Экран администрирования врача',
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
