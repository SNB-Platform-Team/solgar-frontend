import { ContentSection } from '../components/content-section'
import { NotificationsForm } from './notifications-form'

export function SettingsNotifications() {
  return (
    <ContentSection title='Уведомления' desc='Настройки получения уведомлений.'>
      <NotificationsForm />
    </ContentSection>
  )
}
