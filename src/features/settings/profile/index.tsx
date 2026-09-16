import { ContentSection } from '../components/content-section'
import { ProfileForm } from './profile-form'

export function SettingsProfile() {
  return (
    <ContentSection
      title='Профиль'
      desc='Ваши личные данные и информация об учётной записи.'
    >
      <ProfileForm />
    </ContentSection>
  )
}
