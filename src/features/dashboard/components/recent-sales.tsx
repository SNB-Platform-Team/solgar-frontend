import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const recentOrders = [
  { pharmacy: 'Аптека №14, Москва', code: 'A14', amount: '+199 900 ₽' },
  { pharmacy: 'Аптека «Здоровье», СПб', code: 'ЗД', amount: '+39 500 ₽' },
  { pharmacy: 'Аптека №7, Казань', code: 'A7', amount: '+29 900 ₽' },
  { pharmacy: 'Аптека «Ригла», Екатеринбург', code: 'РГ', amount: '+9 900 ₽' },
  { pharmacy: 'Аптека №22, Новосибирск', code: 'A22', amount: '+3 900 ₽' },
]

export function RecentSales() {
  return (
    <div className='space-y-8'>
      {recentOrders.map((order) => (
        <div key={order.pharmacy} className='flex items-center gap-4'>
          <Avatar className='h-9 w-9'>
            <AvatarFallback>{order.code}</AvatarFallback>
          </Avatar>
          <div className='flex flex-1 flex-wrap items-center justify-between'>
            <div className='space-y-1'>
              <p className='text-sm leading-none font-medium'>
                {order.pharmacy}
              </p>
              <p className='text-sm text-muted-foreground'>Заказ 1С</p>
            </div>
            <div className='font-medium'>{order.amount}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
