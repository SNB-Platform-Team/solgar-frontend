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
      titleKey: 'nav.menu',
      items: [
        {
          // Top-level, above Главная — only users with TM_DASHBOARD see it.
          title: 'Дашборд ТМ',
          titleKey: 'nav.tmDashboard',
          url: '/tm-dashboard',
          screen: SCREENS.TM_DASHBOARD,
          icon: LayoutDashboard,
        },
        {
          title: 'Главная',
          titleKey: 'nav.dashboard',
          url: '/',
          // No screen code — Главная is shown to every signed-in user.
          icon: LayoutDashboard,
        },
        {
          title: 'Организация',
          titleKey: 'nav.organization',
          icon: Building,
          items: [
            {
              title: 'Сотрудники',
              titleKey: 'nav.employees',
              url: '/employees',
              screen: SCREENS.EMPLOYEES,
              icon: Users,
            },
          ],
        },
        {
          title: 'Solgar Intern',
          titleKey: 'nav.solgarIntern',
          icon: Package,
          items: [
            {
              title: 'Продаж&Сток',
              titleKey: 'nav.salesStock',
              icon: FileBarChart,
              items: [
                {
                  title: 'Аптечной Сети Ввод Продаж&Сток',
                  titleKey: 'nav.chainSalesUpload',
                  url: '/sales-upload',
                  screen: SCREENS.SALES_UPLOAD,
                  icon: Upload,
                },
                {
                  title: 'Аптечной Сети Просмотр Продаж&Сток',
                  titleKey: 'nav.chainSalesReport',
                  url: '/chain-report',
                  screen: SCREENS.CHAIN_REPORT,
                  icon: BarChart,
                },
                {
                  title: 'Дистрибьютор Ввод Продаж&Сток',
                  titleKey: 'nav.distributorUpload',
                  url: '/distributor-upload',
                  screen: SCREENS.DIST_UPLOAD,
                  icon: Truck,
                },
                {
                  title: 'Дистрибьютор Просмотр Продаж&Сток',
                  titleKey: 'nav.distributorReport',
                  url: '/sales-obs',
                  screen: SCREENS.SALES_OBS,
                  icon: TrendingUp,
                },
              ],
            },
            {
              title: 'Аптек&Врач',
              titleKey: 'nav.pharmacyDoctor',
              icon: Table2,
              items: [
                {
                  title: 'Аптек Управление Данными',
                  titleKey: 'nav.pharmacies',
                  url: '/pharmacies',
                  screen: SCREENS.PHARMACY,
                  icon: Store,
                },
                {
                  title: 'Врач Управление Данными',
                  titleKey: 'nav.doctors',
                  url: '/doctors',
                  screen: SCREENS.DOCTOR,
                  icon: Stethoscope,
                },
              ],
            },
            {
              title: 'Просмотр Отчетов',
              titleKey: 'nav.reports',
              icon: Settings2,
              items: [
                {
                  title: 'Аптек Сводный Обзор',
                  titleKey: 'nav.pharmacyOverview',
                  url: '/pharm-managerial',
                  screen: SCREENS.PHARM_MGR,
                  icon: Building2,
                },
                {
                  title: 'Врач Сводный Обзор',
                  titleKey: 'nav.doctorOverview',
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
          titleKey: 'nav.onec',
          icon: Database,
          items: [
            {
              title: '1C - Склад',
              titleKey: 'nav.onecStock',
              url: '/onec-stock',
              screen: SCREENS.ONEC_STOCK,
              icon: Warehouse,
            },
          ],
        },
        {
          title: 'Аналитика',
          titleKey: 'nav.analytics',
          icon: PieChart,
          items: [
            {
              title: 'Аналитика 1C',
              titleKey: 'nav.analytics1c',
              icon: LineChart,
              items: [
                {
                  title: 'Stock Movement',
                  titleKey: 'nav.stockMovement',
                  url: '/analytics-1c/stock-movement',
                  screen: SCREENS.ANALYTICS,
                  icon: Warehouse,
                },
                {
                  title: 'Distributor Sales',
                  titleKey: 'nav.distributorSales',
                  url: '/analytics-1c/distributor-sales',
                  screen: SCREENS.ANALYTICS,
                  icon: Truck,
                },
                {
                  title: 'Product Sales',
                  titleKey: 'nav.productSales',
                  url: '/analytics-1c/product-sales',
                  screen: SCREENS.ANALYTICS,
                  icon: Package,
                },
              ],
            },
            {
              title: 'Power BI',
              titleKey: 'nav.powerBi',
              icon: Presentation,
              items: [
                {
                  title: 'Solgar EN Online&Offline',
                  titleKey: 'nav.powerBiSolgarEn',
                  url: '/powerbi',
                  screen: SCREENS.ANALYTICS,
                  icon: Presentation,
                  disabled: true,
                },
                {
                  title: 'Solgar Общий Обзор',
                  titleKey: 'nav.powerBiSolgar',
                  url: '/powerbi-obshiy',
                  screen: SCREENS.ANALYTICS,
                  icon: Globe,
                },
                {
                  title: "Nature's Bounty Общий Обзор",
                  titleKey: 'nav.powerBiBounty',
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
          titleKey: 'nav.hrlink',
          url: '/hrlink',
          icon: Link2,
        },
        {
          title: 'Битрикс24',
          titleKey: 'nav.bitrix24',
          url: '/bitrix24',
          icon: MessageCircle,
        },
        {
          title: 'FAQ',
          titleKey: 'nav.faq',
          url: '/faq',
          screen: SCREENS.FAQ,
          icon: HelpCircle,
        },
      ],
    },
  ],
}
