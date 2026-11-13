// src/features/pharmacies/promo-catalog.ts
//
// Промо (POS ekipman) katalogu — DEMO surumu, kodda sabit.
// Kaynak: Olga + Caner'in hazirladigi Word katalogu.
// Yarin DB'ye tasinacak (prm_promo_equipment gibi bir tablo).
//
// Akis: Промо sec -> подтип (subtype) dropdown dolar -> "Выбрать фото"
// butonu galeriyi acar -> secilen foto subtype + boyut + marka'yi doldurur.
//
// Fotolar: src/assets/promo/ altinda. Sadece СТОЙКИ (stand) ve КОРНЕР icin
// demo fotolar var; digerlerinde photo alani undefined (galeri butonu gizli).
import korner1 from '@/assets/promo/korner-1.jpg'
import korner2 from '@/assets/promo/korner-2.jpg'
import stoykaBauntiBelaya from '@/assets/promo/stoyka-baunti-belaya-zakrytaya.jpg'
import stoykaBauntiZelenayaOtk from '@/assets/promo/stoyka-baunti-zelenaya-otkrytaya.jpg'
import stoykaBauntiZelenayaZak from '@/assets/promo/stoyka-baunti-zelenaya-zakrytaya.jpg'
import stoykaElochka from '@/assets/promo/stoyka-elochka.jpg'
import stoykaOtkrytayaShirokaya from '@/assets/promo/stoyka-otkrytaya-shirokaya-seraya.jpg'
import stoykaStarayaOtk from '@/assets/promo/stoyka-staraya-otkrytaya.jpg'
import stoykaStarayaPolovina from '@/assets/promo/stoyka-staraya-polovina-otkrytaya.jpg'
import stoykaShirokayaSeraya from '@/assets/promo/stoyka-zakrytaya-shirokaya-seraya.jpg'
import stoykaBelaya from '@/assets/promo/stoyka-zakrytaya-uzkaya-belaya.jpg'
import stoykaKorichnevaya from '@/assets/promo/stoyka-zakrytaya-uzkaya-korichnevaya.jpg'
import stoykaSeraya from '@/assets/promo/stoyka-zakrytaya-uzkaya-seraya.jpg'

export interface PromoSubtype {
  /** Медицинские представители kolonundaki ad — DB'de sku'ya yazilir */
  name: string
  /** Бренд: SOLGAR / NATURE'S BOUNTY / ikisi */
  brand: string
  /** Габариты (boyut) — demo'da sadece gosterim */
  size: string
  /** Galeri fotografi (sadece bazi subtype'larda) */
  photo?: string
}

export interface PromoCategory {
  /** Ana Промо — DB'de promo kolonuna yazilir */
  code: string
  subtypes: PromoSubtype[]
}

export const PROMO_CATALOG: PromoCategory[] = [
  {
    code: 'СТОЙКИ',
    subtypes: [
      {
        name: 'Стойка закрытая узкая коричневая',
        brand: 'SOLGAR',
        size: '210х75х37',
        photo: stoykaKorichnevaya,
      },
      {
        name: 'Стойка закрытая узкая белая',
        brand: 'SOLGAR',
        size: '210х75х37',
        photo: stoykaBelaya,
      },
      {
        name: 'Стойка закрытая узкая серая',
        brand: 'SOLGAR',
        size: '190х60х40',
        photo: stoykaSeraya,
      },
      {
        name: 'Стойка закрытая широкая серая',
        brand: 'SOLGAR',
        size: '190х76х40',
        photo: stoykaShirokayaSeraya,
      },
      {
        name: 'Стойка открытая широкая серая',
        brand: 'SOLGAR',
        size: '185х74х40',
        photo: stoykaOtkrytayaShirokaya,
      },
      {
        name: 'Стойка Баунти белая закрытая',
        brand: "NATURE'S BOUNTY",
        size: '180х45х30',
        photo: stoykaBauntiBelaya,
      },
      {
        name: 'Стойка Баунти зеленая закрытая',
        brand: "NATURE'S BOUNTY",
        size: '180х45х30',
        photo: stoykaBauntiZelenayaZak,
      },
      {
        name: 'Стойка Баунти зеленая открытая',
        brand: "NATURE'S BOUNTY",
        size: '180х45х30',
        photo: stoykaBauntiZelenayaOtk,
      },
      {
        name: 'Стойка старая открытая',
        brand: 'SOLGAR',
        size: '30х46х175',
        photo: stoykaStarayaOtk,
      },
      {
        name: 'Стойка старая половина открытая',
        brand: 'SOLGAR',
        size: '—',
        photo: stoykaStarayaPolovina,
      },
      {
        name: 'Стойка ёлочка',
        brand: 'SOLGAR',
        size: '60x40x40',
        photo: stoykaElochka,
      },
    ],
  },
  {
    code: 'КОРНЕР',
    subtypes: [
      {
        name: 'Корнер',
        brand: 'SOLGAR',
        size: 'Индивидуальный размер',
        photo: korner1,
      },
      {
        name: 'Корнер (вариант 2)',
        brand: 'SOLGAR',
        size: 'Индивидуальный размер',
        photo: korner2,
      },
    ],
  },
  {
    code: 'ХАРДПОСТЕР',
    subtypes: [
      { name: 'Хардпостер большой', brand: '', size: '—' },
      { name: 'Хардпостер маленький', brand: '', size: '—' },
    ],
  },
  {
    code: '3D БАНКА',
    subtypes: [{ name: '3D банка', brand: '', size: '—' }],
  },
  {
    code: 'РОЛЛ_АПП',
    subtypes: [
      {
        name: 'Ролл-апп',
        brand: 'SOLGAR, BOUNTY',
        size: 'Индивидуальный размер',
      },
    ],
  },
  {
    code: 'ЛАЙТБОКС',
    subtypes: [
      {
        name: 'Лайтбокс',
        brand: 'SOLGAR, BOUNTY',
        size: 'Индивидуальный размер',
      },
    ],
  },
  {
    code: 'АНТИКРАЖНЫЕ ВОРОТА',
    subtypes: [
      {
        name: 'Антикражные ворота',
        brand: 'SOLGAR, BOUNTY',
        size: 'Индивидуальный размер',
      },
    ],
  },
  {
    code: 'КАТАЛОЖНИЦА',
    subtypes: [{ name: 'Каталожница', brand: 'SOLGAR', size: '—' }],
  },
  {
    code: 'КОВРИК',
    subtypes: [
      {
        name: 'Брендированный коврик (квадратный)',
        brand: 'SOLGAR',
        size: 'квадратный',
      },
      {
        name: 'Брендированный коврик (прямоугольный)',
        brand: 'SOLGAR',
        size: 'прямоугольный',
      },
    ],
  },
  {
    code: 'ПУФИК',
    subtypes: [{ name: 'Брендированный пуфик', brand: 'SOLGAR', size: '—' }],
  },
]

/** Promo kodlari (dropdown 1) */
export const PROMO_CODES = PROMO_CATALOG.map((c) => c.code)

// The backend's Промо list (equipment/meta) spells two codes differently.
const CODE_ALIASES: Record<string, string> = {
  'РОЛЛ-АП': 'РОЛЛ_АПП',
  '3Д БАНКА': '3D БАНКА',
}

/** Bir promo kodunun alt tipleri (dropdown 2) */
export function subtypesFor(code: string): PromoSubtype[] {
  const key = CODE_ALIASES[code] ?? code
  return PROMO_CATALOG.find((c) => c.code === key)?.subtypes ?? []
}

/** Bir promo kodunun fotolu alt tipleri (galeri) */
export function photoSubtypesFor(code: string): PromoSubtype[] {
  return subtypesFor(code).filter((s) => s.photo)
}
