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
import { SCREENS } from '@/lib/screens'
import { type SidebarData } from '../types'

// `user` is only a placeholder — AppSidebar swaps in the real session
// (display_name/username from /sales/api/me/) as soon as it loads. Each
// link's `screen` is the code the user needs to see it (lib/screens.ts).
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
          // No screen code — Главная is shown to every signed-in user.
          icon: LayoutDashboard,
        },
        {
          title: 'Организация',
          icon: Building,
          items: [
            {
              title: 'Сотрудники',
              url: '/employees',
              screen: SCREENS.EMPLOYEES,
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
                  screen: SCREENS.SALES_UPLOAD,
                  icon: Upload,
                },
                {
                  title: 'Аптечной Сети Просмотр Продаж&Сток',
                  url: '/chain-report',
                  screen: SCREENS.CHAIN_REPORT,
                  icon: BarChart,
                },
                {
                  title: 'Дистрибьютор Ввод Продаж&Сток',
                  url: '/distributor-upload',
                  screen: SCREENS.DIST_UPLOAD,
                  icon: Truck,
                },
                {
                  title: 'Дистрибьютор Просмотр Продаж&Сток',
                  url: '/sales-obs',
                  screen: SCREENS.SALES_OBS,
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
                  screen: SCREENS.PHARMACY,
                  icon: Store,
                },
                {
                  title: 'Врач Управление Данными',
                  url: '/doctors',
                  screen: SCREENS.DOCTOR,
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
                  screen: SCREENS.PHARM_MGR,
                  icon: Building2,
                },
                {
                  title: 'Врач Сводный Обзор',
                  url: '/doctor-managerial',
                  screen: SCREENS.DOCTOR_MGR,
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
              screen: SCREENS.ONEC_STOCK,
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
              icon: LineChart,
              items: [
                {
                  title: 'Stock Movement',
                  url: '/analytics-1c/stock-movement',
                  screen: SCREENS.ANALYTICS,
                  icon: Warehouse,
                },
                {
                  title: 'Distributor Sales',
                  url: '/analytics-1c/distributor-sales',
                  screen: SCREENS.ANALYTICS,
                  icon: Truck,
                },
                {
                  title: 'Product Sales',
                  url: '/analytics-1c/product-sales',
                  screen: SCREENS.ANALYTICS,
                  icon: Package,
                },
              ],
            },
            {
              title: 'Power BI',
              icon: Presentation,
              items: [
                {
                  title: 'Solgar EN Online&Offline',
                  url: '/powerbi',
                  screen: SCREENS.ANALYTICS,
                  icon: Presentation,
                  disabled: true,
                },
                {
                  title: 'Solgar Общий Обзор',
                  url: '/powerbi-obshiy',
                  screen: SCREENS.ANALYTICS,
                  icon: Globe,
                },
                {
                  title: "Nature's Bounty Общий Обзор",
                  url: '/powerbi-bounty',
                  screen: SCREENS.ANALYTICS,
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
          screen: SCREENS.FAQ,
          icon: HelpCircle,
        },
      ],
    },
  ],
}
