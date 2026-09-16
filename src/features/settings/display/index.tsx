import { ContentSection } from '../components/content-section'
import { DisplayForm } from './display-form'

export function SettingsDisplay() {
  return (
    <ContentSection
      title='Отображение'
      desc='Отображаемые элементы интерфейса.'
    >
      <DisplayForm />
    </ContentSection>
  )
}
