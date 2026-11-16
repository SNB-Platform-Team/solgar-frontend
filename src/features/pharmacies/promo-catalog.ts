// src/features/pharmacies/promo-catalog.ts
//
// Промо (POS ekipman) katalogu — DEMO surumu, kodda sabit.
// Kaynak: Olga + Caner'in hazirladigi Word katalogu.
// Yarin DB'ye tasinacak (prm_promo_equipment gibi bir tablo).
//
// Akis: Промо sec -> подтип (subtype) dropdown dolar -> "Выбрать фото"
// butonu galeriyi acar -> secilen foto subtype + boyut + marka'yi doldurur.
//
// Fotolar: СТОЙКИ / КОРНЕР / 3Д БАНКА подтип'leri backend API'den gelir,
// fotolari public/promo_images/ altinda (PUBLIC_PROMO_PHOTOS, asagida).

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
      },
      {
        name: 'Стойка закрытая узкая белая',
        brand: 'SOLGAR',
        size: '210х75х37',
      },
      {
        name: 'Стойка закрытая узкая серая',
        brand: 'SOLGAR',
        size: '190х60х40',
      },
      {
        name: 'Стойка закрытая широкая серая',
        brand: 'SOLGAR',
        size: '190х76х40',
      },
      {
        name: 'Стойка открытая широкая серая',
        brand: 'SOLGAR',
        size: '185х74х40',
      },
      {
        name: 'Стойка Баунти белая закрытая',
        brand: "NATURE'S BOUNTY",
        size: '180х45х30',
      },
      {
        name: 'Стойка Баунти зеленая закрытая',
        brand: "NATURE'S BOUNTY",
        size: '180х45х30',
      },
      {
        name: 'Стойка Баунти зеленая открытая',
        brand: "NATURE'S BOUNTY",
        size: '180х45х30',
      },
      {
        name: 'Стойка старая открытая',
        brand: 'SOLGAR',
        size: '30х46х175',
      },
      {
        name: 'Стойка старая половина открытая',
        brand: 'SOLGAR',
        size: '—',
      },
      {
        name: 'Стойка ёлочка',
        brand: 'SOLGAR',
        size: '60x40x40',
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
      },
      {
        name: 'Корнер (вариант 2)',
        brand: 'SOLGAR',
        size: 'Индивидуальный размер',
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

/** Промо whose Подтип is picked only from photos («Выбрать фото», no text
 * list) and whose Размер comes only from the picked Подтип (not editable).
 * Their Подтип/Размер list comes from the backend
 * (/sales/api/pharmacy/equipment/subtypes/), not from PROMO_CATALOG; the
 * value is the `promo` that API expects (prm_pos_classification.marketing). */
const API_SUBTYPE_PROMOS: Record<string, string> = {
  СТОЙКИ: 'Стойка',
  КОРНЕР: 'Корнер',
  '3Д БАНКА': '3Д Банка',
  КАТАЛОЖНИЦА: 'Каталожница',
  КОВРИК: 'Брендированный коврик',
  ПУФИК: 'Брендированный пуфик',
  ЛАЙТБОКС: 'Лайтбокс',
  'ОСВЕЩЕНИЕ ВЫКЛАДКИ': 'Освещение выкладки',
  'АНТИКРАЖНЫЕ ВОРОТА': 'Антикражные ворота',
  ПЛАКАТ: 'Плакат',
  'РОЛЛ-АП': 'Ролл-ап',
  ХАРДПОСТЕР: 'Хардпостер',
  // the catalog's spellings, offered if equipment/meta hasn't answered
  '3D БАНКА': '3Д Банка',
  РОЛЛ_АПП: 'Ролл-ап',
}

export function isPhotoOnlyPromo(code: string): boolean {
  return code in API_SUBTYPE_PROMOS
}

/** The subtypes API's `promo` for this Промо, or null if it isn't API-backed. */
export function apiSubtypePromo(code: string): string | null {
  return API_SUBTYPE_PROMOS[code] ?? null
}

// Подтип names compared loosely: case, ё/е, Latin/Cyrillic х, spacing.
const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/x/g, 'х')
    .replace(/\s+/g, ' ')
    .trim()

// Photos for the API-backed Подтип, served from public/promo_images/ —
// keyed by normName(Подтип). A value is one file, or one per brand when both
// brands share the Подтип name (Корнер). 3Д Банка's single Подтип is spelled
// per brand instead: SL «3D банка» (Latin D), BN «3Д Банка».
// A brand with no file (e.g. Хардпостер маленький for BOUNTY) → «Нет фото».
type PhotoFile = string | { SL?: string; BN?: string }
const PUBLIC_PROMO_PHOTOS: Record<string, PhotoFile> = {
  'стойка елочка': 'stoyka-elochka.jpg',
  'стойка закрытая узкая белая': 'stoyka-zakrytaya-uzkaya-belaya.jpg',
  'стойка закрытая узкая коричневая':
    'stoyka-zakrytaya-uzkaya-korichnevaya.jpg',
  'стойка закрытая узкая серая': 'stoyka-zakrytaya-uzkaya-seraya.jpg',
  'стойка закрытая широкая серая': 'stoyka-zakrytaya-shirokaya-seraya.jpg',
  'стойка открытая широкая серая': 'stoyka-otkrytaya-shirokaya-seraya.jpg',
  'стойка старая открытая': 'stoyka-staraya-otkrytaya.jpg',
  'стойка старая половина открытая': 'stoyka-staraya-polovina-otkrytaya.jpg',
  'стойка баунти белая закрытая': 'stoyka-baunti-belaya-zakrytaya.jpg',
  'стойка баунти зеленая закрытая': 'stoyka-baunti-zelenaya-zakrytaya.jpg',
  'стойка баунти зеленая открытая': 'stoyka-baunti-zelenaya-otkrytaya.jpg',
  корнер: { SL: 'korner-sl.jpg', BN: 'korner-bn.jpg' },
  '3d банка': '3d-banka-sl.jpg',
  '3д банка': '3d-banka-bn.jpg',
  каталожница: { SL: 'katalozhnitsa-sl.jpg', BN: 'katalozhnitsa-bn.jpg' },
  'брендированный коврик квадратный': 'kovrik-kvadratnyj.jpg',
  'брендированный коврик прямоугольный': 'kovrik-pryamougolnyj.jpg',
  лайтбокс: { SL: 'lajtboks-sl.jpg', BN: 'lajtboks-bn.jpg' },
  'освещение выкладки': {
    SL: 'osveshchenie-vykladki-sl.jpg',
    BN: 'osveshchenie-vykladki-bn.jpg',
  },
  'брендированный пуфик': 'pufik-sl.jpg',
  'антикражные ворота наклейка': {
    SL: 'antikrazhnye-vorota-naklejka-sl.jpg',
    BN: 'antikrazhnye-vorota-naklejka-bn.jpg',
  },
  'антикражные ворота картон': {
    SL: 'antikrazhnye-vorota-karton-sl.jpg',
    BN: 'antikrazhnye-vorota-karton-bn.jpg',
  },
  'плакат наклейка': {
    SL: 'plakat-naklejka-sl.jpg',
    BN: 'plakat-naklejka-bn.jpg',
  },
  'плакат в рамке': {
    SL: 'plakat-v-ramke-sl.jpg',
    BN: 'plakat-v-ramke-bn.jpg',
  },
  'ролл-ап узкий': { SL: 'roll-ap-uzkij-sl.jpg', BN: 'roll-ap-uzkij-bn.jpg' },
  'ролл-ап широкий': {
    SL: 'roll-ap-shirokij-sl.jpg',
    BN: 'roll-ap-shirokij-bn.jpg',
  },
  'хардпостер большой': {
    SL: 'hardposter-bolshoj-sl.jpg',
    BN: 'hardposter-bolshoj-bn.jpg',
  },
  'хардпостер маленький': { SL: 'hardposter-malenkij-sl.jpg' },
}

/** The photo (public/promo_images/) for a Подтип name as the backend spells
 * it, for the user's brand (equipment API's SOLGAR / BOUNTY) — undefined if
 * none matches (the gallery then shows the name, and «Нет фото»). */
export function photoForSubtype(
  name: string,
  brand: string
): string | undefined {
  const entry = PUBLIC_PROMO_PHOTOS[normName(name)]
  if (!entry) return undefined
  const file =
    typeof entry === 'string'
      ? entry
      : brand.toUpperCase().includes('BOUNTY')
        ? entry.BN
        : entry.SL
  return file ? `${import.meta.env.BASE_URL}promo_images/${file}` : undefined
}

/** Bir promo kodunun fotolu alt tipleri (galeri) */
export function photoSubtypesFor(code: string): PromoSubtype[] {
  return subtypesFor(code).filter((s) => s.photo)
}
