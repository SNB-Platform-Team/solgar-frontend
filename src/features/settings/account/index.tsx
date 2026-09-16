import { ContentSection } from '../components/content-section'
import { AccountForm } from './account-form'

export function SettingsAccount() {
  return (
    <ContentSection
      title='Аккаунт'
      desc='Настройки учётной записи, язык и часовой пояс.'
    >
      <AccountForm />
    </ContentSection>
  )
}
