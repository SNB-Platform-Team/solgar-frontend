/**
 * POS имидж name → image file, per brand. Names are exactly what
 * GET /sales/api/pharmacy/equipment/meta/ returns in `imidzh` (some start
 * with a Latin K/O — copied verbatim from the backend's list). The files
 * live in public/pos_images/{SL,NB}/; a name with no entry here (or whose
 * file fails to load) is shown as a text-only chip.
 */
const POS_IMAGES: Record<
  'SL' | 'NB',
  { folder: string; files: Record<string, string> }
> = {
  SL: {
    folder: 'SL',
    files: {
      'Kангавитес, комплекс мультивитаминов и минералов': 'kangavites.jpg',
      'Время позаботиться о своей красоте Кожа, ногти, волосы':
        'vremya_krasota.jpg',
      'Глицинат магния': 'glicinat_magniya.jpg',
      'Ежедневный заряд энергии Мультиван': 'multivan.jpg',
      'Комплекс коллагена и гиалуроновой кислоты': 'kollagen_gialuron.jpg',
      Нейронутриентс: 'neuronutrients.jpg',
      'Нужна энергия как у ребенка Цитрат магния': 'citrat_energiya.jpg',
      'Омега-комплекс из дикого океанического лосося': 'omega_losos.jpg',
      'Полина Аскери Антиоксидантная формула': 'askeri_antioksidant.jpg',
      'Полина Аскери Цитрат магния (порошок)': 'askeri_citrat_poroshok.jpg',
      'Полина Аскери Эстер-С плюс витамин С 500 мг': 'askeri_ester_c.jpg',
      'Порошок цитрат магния': 'citrat_poroshok.jpg',
      'Тройная Омега-3 950 мг ЭПК и ДГК': 'troynaya_omega3.jpg',
      'Хотите проверить свои физические способности Тройная Омега-3 950 мг ЭПК и ДГК':
        'omega3_sport.jpg',
      'Хотите фото без фильтров Кожа, ногти, волосы': 'foto_bez_filtrov.jpg',
      'Цените золотые моменты Кангавитес, комплекс мультивитаминов и минералов':
        'zolotye_kangavites.jpg',
      'Эстер-С с витамином С 500 мг': 'ester_c.jpg',
    },
  },
  NB: {
    folder: 'NB',
    files: {
      'Oмега-3 из морских водорослей': 'omega3_vodorosli.jpg',
      'Ацидофилус Пробиотик': 'acidofilus_probiotik.jpg',
      'Гидролизованный коллаген с витамином С': 'kollagen_vitc.jpg',
      'Глицинат магния': 'glicinat_magniya.jpg',
      'Кальций Магний Цинк': 'calcium_magnesium_zinc.jpg',
      'Коэнзим Q10 100 мг': 'coenzim_q10.jpg',
      'Мультидэй с экстрактом листьев зеленого чая': 'multiday.jpg',
      'Рыбий жир 1000 мг Омега-3': 'rybiy_zhir.jpg',
      'Цитрат магния с витамином В6': 'citrat_b6.jpg',
      'Эстер-С 500 мг': 'ester_c_nb.jpg',
    },
  },
}

/** The image URL for an имидж of the user's brand (meta's `brand`:
 * SOLGAR / BOUNTY), or null when there's no file for that name. */
export function posImageUrl(brand: string, name: string): string | null {
  const key = brand.toUpperCase().includes('BOUNTY') ? 'NB' : 'SL'
  const { folder, files } = POS_IMAGES[key]
  const file = files[name]
  return file ? `${import.meta.env.BASE_URL}pos_images/${folder}/${file}` : null
}
