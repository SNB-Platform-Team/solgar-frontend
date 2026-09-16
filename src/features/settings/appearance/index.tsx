import { ContentSection } from '../components/content-section'
import { AppearanceForm } from './appearance-form'

export function SettingsAppearance() {
  return (
    <ContentSection
      title='Внешний вид'
      desc='Оформление приложения — тема и шрифт.'
    >
      <AppearanceForm />
    </ContentSection>
  )
}
