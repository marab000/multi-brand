export type CatalogMatcher =
  | { type: 'exact'; value: string }
  | { type: 'includes'; value: string }
  | { type: 'startsWith'; value: string };

export type CatalogLeaf = {
  slug: string;
  name: string;
  productTypes: string[];
  matchers?: CatalogMatcher[];
};

export type CatalogGroup = {
  slug: string;
  name: string;
  categories: string[];
  leaves: CatalogLeaf[];
  isDefault?: boolean;
  isDynamicByProductType?: boolean;
  matchers?: CatalogMatcher[];
};

export type CatalogRoot = {
  slug: string;
  name: string;
  groups: CatalogGroup[];
};

export type ResolvedCatalog = {
  root: { slug: string; name: string } | null;
  group: { slug: string; name: string } | null;
  leaf: { slug: string; name: string } | null;
};

export type CatalogNavItem = {
  name: string;
  slug: string;
  href: string;
  level: 'group' | 'leaf';
};

export type CatalogShowcaseSection = {
  slug: string;
  name: string;
  items: {
    name: string;
    slug: string;
    href: string;
  }[];
};

export type CatalogAvailabilityRow = {
  root_slug: string | null;
  group_slug: string | null;
  leaf_slug: string | null;
};

function slugify(str: string) {
  const map: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    е: 'e',
    ё: 'e',
    ж: 'zh',
    з: 'z',
    и: 'i',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'c',
    ч: 'ch',
    ш: 'sh',
    щ: 'sch',
    ы: 'y',
    э: 'e',
    ю: 'yu',
    я: 'ya',
    ъ: '',
    ь: ''
  };
  return str
    .replace(/A/g, 'А')
    .replace(/a/g, 'а')
    .replace(/B/g, 'В')
    .replace(/E/g, 'Е')
    .replace(/e/g, 'е')
    .replace(/K/g, 'К')
    .replace(/k/g, 'к')
    .replace(/M/g, 'М')
    .replace(/H/g, 'Н')
    .replace(/O/g, 'О')
    .replace(/o/g, 'о')
    .replace(/P/g, 'Р')
    .replace(/p/g, 'р')
    .replace(/C/g, 'С')
    .replace(/c/g, 'с')
    .replace(/T/g, 'Т')
    .replace(/X/g, 'Х')
    .replace(/x/g, 'х')
    .replace(/Y/g, 'У')
    .replace(/y/g, 'у')
    .toLowerCase()
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalize(value: string | null | undefined) {
  return String(value || '')
    .replace(/A/g, 'А')
    .replace(/a/g, 'а')
    .replace(/B/g, 'В')
    .replace(/E/g, 'Е')
    .replace(/e/g, 'е')
    .replace(/K/g, 'К')
    .replace(/k/g, 'к')
    .replace(/M/g, 'М')
    .replace(/H/g, 'Н')
    .replace(/O/g, 'О')
    .replace(/o/g, 'о')
    .replace(/P/g, 'Р')
    .replace(/p/g, 'р')
    .replace(/C/g, 'С')
    .replace(/c/g, 'с')
    .replace(/T/g, 'Т')
    .replace(/X/g, 'Х')
    .replace(/x/g, 'х')
    .replace(/Y/g, 'У')
    .replace(/y/g, 'у')
    .trim()
    .toLowerCase();
}

function makeLeaf(
  name: string,
  productTypes: string[] = [],
  options?: { matchers?: CatalogMatcher[] }
): CatalogLeaf {
  return {
    name,
    slug: slugify(name),
    productTypes,
    ...(options?.matchers?.length ? { matchers: options.matchers } : {})
  };
}

function makeGroup(
  name: string,
  categories: string[],
  options?: {
    leaves?: CatalogLeaf[];
    isDefault?: boolean;
    isDynamicByProductType?: boolean;
    matchers?: CatalogMatcher[];
  }
): CatalogGroup {
  return {
    name,
    slug: slugify(name),
    categories,
    leaves: options?.leaves ?? [],
    ...(options?.isDefault ? { isDefault: true } : {}),
    ...(options?.isDynamicByProductType ? { isDynamicByProductType: true } : {}),
    ...(options?.matchers?.length ? { matchers: options.matchers } : {})
  };
}

function makeRoot(name: string, groups: CatalogGroup[]): CatalogRoot {
  return { name, slug: slugify(name), groups };
}

function matchesByMatchers(
  matchers: CatalogMatcher[] | undefined,
  productType: string | null | undefined
) {
  const normalizedType = normalize(productType);
  if (!normalizedType || !matchers?.length) return false;
  return matchers.some((matcher) => {
    const value = normalize(matcher.value);
    if (!value) return false;
    if (matcher.type === 'exact') return normalizedType === value;
    if (matcher.type === 'includes') return normalizedType.includes(value);
    if (matcher.type === 'startsWith') return normalizedType.startsWith(value);
    return false;
  });
}

function leafMatchesProductType(leaf: CatalogLeaf, productType: string | null | undefined) {
  const normalizedType = normalize(productType);
  if (!normalizedType) return false;
  if (leaf.productTypes.some((item) => normalize(item) === normalizedType)) return true;
  return matchesByMatchers(leaf.matchers, productType);
}

function groupMatchesProductType(group: CatalogGroup, productType: string | null | undefined) {
  return matchesByMatchers(group.matchers, productType);
}

const VSTRAIVAEMAYA_TEHNIKA = 'Встраиваемая техника';
const KRUPNAYA_BBT = 'Крупная бытовая техника';
const MELKAYA_BBT = 'Мелкая бытовая техника';
const KUHONNYE_VYTYAZHKI = 'Кухонные вытяжки';
const KUHONNYE_MOYKI = 'Кухонные мойки';
const IZMELCHITELI = 'Измельчители пищевых отходов';
const ZAPCHASTI_TEHNIKA = 'Запчасти и аксессуары для техники';
const ZAPCHASTI_MOYKI = 'Запчасти для моек, смесителей, измельчителей и мусорных систем';
const KLIMAT = 'Климатическая техника';
const PROF = 'Профессиональная техника';
const SMESITELI = 'Смесители';

export const catalogTree: CatalogRoot[] = [
  makeRoot(KRUPNAYA_BBT, [
    makeGroup('Холодильники и морозильники', [KRUPNAYA_BBT], {
      leaves: [
        makeLeaf('Для сухого вызревания мяса', ['Холодильник для сухого вызревания мяса']),
        makeLeaf('Однокамерные холодильники', ['Однокамерный холодильник отдельностоящий']),
        makeLeaf('Двухкамерные холодильники', ['Двухкамерный холодильник отдельностоящий']),
        makeLeaf('Трехкамерные холодильники', ['Трехкамерные холодильники отдельностоящие']),
        makeLeaf('Многокамерные холодильники', ['Многокамерный холодильник отдельностоящий']),
        makeLeaf('Холодильники Side-by-Side', ['Холодильник Side-by-Side отдельностоящий']),
        makeLeaf('Морозильные камеры', ['Морозильная камера отдельностоящая']),
        makeLeaf('Морозильные лари', ['Морозильный ларь']),
        makeLeaf('Шкафы для хранения шуб', ['Холодильный шкаф для хранения шуб']),
        makeLeaf('Льдогенераторы', ['Льдогенератор']),
        makeLeaf('Комплекты Side-by-Side', ['Комплект Side-by-Side холодильники и морозильники'])
      ]
    }),
    makeGroup('Стиральные и сушильные машины', [KRUPNAYA_BBT], {
      leaves: [
        makeLeaf('Комплект стиральная машина + сушильная машина', [
          'Комплект стиральная машина + сушильная машина'
        ]),
        makeLeaf('Активаторные стиральные машины', ['Стиральная машина активаторная']),
        makeLeaf('Фронтальные стиральные машины', ['Стиральная машина с фронтальной загрузкой']),
        makeLeaf('Вертикальные стиральные машины', ['Стиральная машина с вертикальной загрузкой']),
        makeLeaf('Стирально-сушильные машины', ['Стирально-сушильная машина отдельностоящая']),
        makeLeaf('Сушильные машины', ['Сушильная машина отдельностоящая']),
        makeLeaf('Сушильные шкафы', ['Сушильный шкаф'])
      ]
    }),
    makeGroup('Посудомоечные машины', [KRUPNAYA_BBT], {
      leaves: [
        makeLeaf('Полноразмерные', ['Отдельностоящая посудомоечная машина']),
        makeLeaf('Компактные', ['Компактная отдельностоящая посудомоечная машина'])
      ]
    }),
    makeGroup('Винные шкафы', [KRUPNAYA_BBT], {
      leaves: [
        makeLeaf('Встраиваемые винные шкафы', ['Встраиваемый винный шкаф']),
        makeLeaf('Отдельностоящие винные шкафы', ['Отдельностоящий винный шкаф']),
        makeLeaf('Минибары', ['Отдельностоящий минибар']),
        makeLeaf('Холодильники для сигар', ['Холодильник для сигар'])
      ]
    }),
    makeGroup('Плиты', [KRUPNAYA_BBT], {
      leaves: [
        makeLeaf('Газовые плиты', ['Газовая плита']),
        makeLeaf('Стеклокерамические плиты', ['Стеклокерамическая плита']),
        makeLeaf('Индукционные плиты', ['Индукционная плита']),
        makeLeaf('Электрические плиты', ['Электрическая плита']),
        makeLeaf('Комбинированные плиты', ['Комбинированная плита']),
        makeLeaf('Варочные центры', ['Варочный центр'])
      ]
    }),
    makeGroup('Красота и здоровье', [KRUPNAYA_BBT], {
      leaves: [makeLeaf('Холодильники для косметики', ['Холодильник для косметики'])]
    }),
    makeGroup('Техника для кухни', [KRUPNAYA_BBT], {
      leaves: [makeLeaf('Диспенсеры для воды', ['Диспенсер для воды'])]
    }),
    makeGroup(KRUPNAYA_BBT, [KRUPNAYA_BBT], { isDefault: true })
  ]),
  makeRoot(MELKAYA_BBT, [
    makeGroup('Микроволновые печи', [MELKAYA_BBT], {
      leaves: [
        makeLeaf('Отдельностоящие микроволновые печи', ['Отдельностоящая микроволновая печь'])
      ]
    }),
    makeGroup('Приготовление кофе', [MELKAYA_BBT], {
      leaves: [
        makeLeaf('Кофеварки', ['Кофеварка']),
        makeLeaf('Кофемолки', ['Кофемолка']),
        makeLeaf('Кофейные станции', ['Кофейная станция']),
        makeLeaf('Вспениватели молока', ['Вспениватель молока'])
      ]
    }),
    makeGroup('Пылесосы', [MELKAYA_BBT], {
      leaves: [
        makeLeaf('Пылесосы', ['Пылесос']),
        makeLeaf('Роботы-мойщики окон', ['Робот — мойщик окон'])
      ]
    }),
    makeGroup('Техника для кухни', [MELKAYA_BBT], {
      leaves: [
        makeLeaf('Чайники и термопоты', ['Чайник', 'Термопот']),
        makeLeaf('Тостеры и вафельницы', ['Тостер', 'Вафельница']),
        makeLeaf('Грили и аэрогрили', ['Гриль', 'Аэрогриль']),
        makeLeaf('Плитки и печи', [
          'Индукционная плитка',
          'Электрическая плитка',
          'Печь конвекционная'
        ]),
        makeLeaf('Миксеры и комбайны', ['Миксер', 'Кухонный комбайн']),
        makeLeaf('Мясорубки и измельчители', ['Мясорубка', 'Измельчитель', 'Овощерезка']),
        makeLeaf('Соковыжималки и су-вид', ['Соковыжималка', 'Су-вид']),
        makeLeaf('Хлебопечи', ['Хлебопечь']),
        makeLeaf('Весы', ['Весы кухонные', 'Весы напольные']),
        makeLeaf('Ломтерезки и штопоры', ['Ломтерезка', 'Штопор электрический']),
        makeLeaf('Диспенсеры для воды', ['Диспенсер для воды'])
      ]
    }),
    makeGroup('Уход за одеждой', [MELKAYA_BBT], {
      leaves: [
        makeLeaf('Утюги и отпариватели', ['Утюг', 'Отпариватель']),
        makeLeaf('Гладильные станции', ['Паровая гладильная станция'])
      ]
    }),
    makeGroup('Холодильники и морозильники', [MELKAYA_BBT], { leaves: [] }),
    makeGroup(MELKAYA_BBT, [MELKAYA_BBT], { isDefault: true })
  ]),
  makeRoot(VSTRAIVAEMAYA_TEHNIKA, [
    makeGroup('Комплекты', [VSTRAIVAEMAYA_TEHNIKA], {
      leaves: [
        makeLeaf('Комплект варка + духовка', ['Комплект варка + духовка']),
        makeLeaf('Комплект варка + духовка + свч', ['Комплект варка + духовка + свч']),
        makeLeaf('Комплект варка + духовка + свч + кофемашина', [
          'Комплект варка + духовка + свч + кофемашина'
        ]),
        makeLeaf('Комплект варка + духовка + свч + пмм + холодил.', [
          'Комплект варка + духовка + свч + пмм + холодил.'
        ])
      ]
    }),
    makeGroup('Варочные поверхности', [VSTRAIVAEMAYA_TEHNIKA], {
      leaves: [
        makeLeaf('Газовые', ['Газовая поверхность']),
        makeLeaf('Индукционные', ['Индукционная поверхность']),
        makeLeaf('Комбинированные', ['Комбинированная поверхность']),
        makeLeaf('Электрические', ['Электрическая поверхность']),
        makeLeaf('Стеклокерамические', ['Стеклокерамическая поверхность']),
        makeLeaf('Барбекю', ['Барбекю'])
      ]
    }),
    makeGroup('Духовые шкафы', [VSTRAIVAEMAYA_TEHNIKA], {
      leaves: [
        makeLeaf('Электрические духовые шкафы', ['Электрический духовой шкаф']),
        makeLeaf('Компактные духовые шкафы', ['Компактный духовой шкаф']),
        makeLeaf('Газовые духовые шкафы', ['Газовый духовой шкаф']),
        makeLeaf('Подогреватели посуды', ['Ящик для подогрева посуды']),
        makeLeaf('Вакуумные упаковщики', ['Вакуумный упаковщик']),
        makeLeaf('Электрические грили', ['Электрический встраиваемый гриль'])
      ]
    }),
    makeGroup('Посудомоечные машины', [VSTRAIVAEMAYA_TEHNIKA], {
      leaves: [
        makeLeaf('Полноразмерные', ['Встраиваемая посудомоечная машина']),
        makeLeaf('Компактные', ['Компактная встраиваемая посудомоечная машина'])
      ]
    }),
    makeGroup('Микроволновые печи', [VSTRAIVAEMAYA_TEHNIKA], {
      leaves: [makeLeaf('Встраиваемые микроволновые печи', ['Встраиваемая микроволновая печь'])]
    }),
    makeGroup('Кофемашины', [VSTRAIVAEMAYA_TEHNIKA], {
      leaves: [makeLeaf('Встраиваемые кофемашины', ['Кофемашина встраиваемая'])]
    }),
    makeGroup('Пароварки', [VSTRAIVAEMAYA_TEHNIKA], {
      leaves: [makeLeaf('Пароварки', ['Пароварка'])]
    }),
    makeGroup('Стиральные и сушильные машины', [VSTRAIVAEMAYA_TEHNIKA], {
      leaves: [
        makeLeaf('Стиральные машины', ['Стиральная машина встраиваемая']),
        makeLeaf('Стирально-сушильные машины', ['Стирально-сушильная машина встраиваемая'])
      ]
    }),
    makeGroup('Холодильники и морозильники', [VSTRAIVAEMAYA_TEHNIKA], {
      leaves: [
        makeLeaf('Однокамерные холодильники', ['Однокамерный холодильник встраиваемый']),
        makeLeaf('Двухкамерные холодильники', ['Двухкамерный холодильник встраиваемый']),
        makeLeaf('Трехкамерные холодильники', ['Трехкамерный холодильник встраиваемый']),
        makeLeaf('Холодильники Side-by-Side', ['Холодильник Side-by-Side встраиваемый']),
        makeLeaf('Морозильные камеры', ['Морозильная камера встраиваемая'])
      ]
    }),
    makeGroup('Винные шкафы', [VSTRAIVAEMAYA_TEHNIKA], {
      leaves: [makeLeaf('Встраиваемые винные шкафы', ['Встраиваемый винный шкаф'])]
    }),
    makeGroup('Сеты варка + духовка', [VSTRAIVAEMAYA_TEHNIKA], {
      leaves: [makeLeaf('Сеты варка + духовка', ['Встраиваемый сет: духовой шкаф + поверхность'])]
    }),
    makeGroup(VSTRAIVAEMAYA_TEHNIKA, [VSTRAIVAEMAYA_TEHNIKA], { isDefault: true })
  ]),
  makeRoot(KUHONNYE_VYTYAZHKI, [
    makeGroup('Вытяжки встраиваемые', [KUHONNYE_VYTYAZHKI], {
      leaves: [
        makeLeaf('Телескопические', ['Вытяжка телескопическая']),
        makeLeaf('В подвесной шкаф', ['Вытяжка в подвесной шкаф']),
        makeLeaf('В потолок', ['Вытяжка в потолок']),
        makeLeaf('В столешницу', ['Вытяжка в столешницу'])
      ]
    }),
    makeGroup('Вытяжки отдельностоящие', [KUHONNYE_VYTYAZHKI], {
      leaves: [
        makeLeaf('Наклонные', ['Вытяжка наклонная']),
        makeLeaf('Островные', [
          'Вытяжка островная',
          'Вытяжка островная кубическая',
          'Вытяжка островная Т - образная',
          'Вытяжка островная цилиндрическая'
        ]),
        makeLeaf('Пристенные', [
          'Вытяжка пристенная',
          'Вытяжка пристенная кубическая',
          'Вытяжка пристенная Т - образная',
          'Вытяжка пристенная цилиндрическая'
        ]),
        makeLeaf('Классические', ['Вытяжка классическая']),
        makeLeaf('Угловые', ['Вытяжка угловая']),
        makeLeaf('Стандартные', ['Вытяжка стандартная'])
      ]
    }),
    makeGroup(KUHONNYE_VYTYAZHKI, [KUHONNYE_VYTYAZHKI], { isDefault: true })
  ]),
  makeRoot(KUHONNYE_MOYKI, [
    makeGroup('Мойки из металла и камня', [KUHONNYE_MOYKI], {
      leaves: [
        makeLeaf('Гранитные мойки', ['Мойка гранитная']),
        makeLeaf('Мойки из искусственного мрамора', ['Мойка из искусственного мрамора']),
        makeLeaf('Мойки из натуральной меди/латуни', ['Мойка из натуральной меди/латуни']),
        makeLeaf('Мойки из нержавеющей стали', ['Мойка из нержавеющей стали']),
        makeLeaf('Керамические мойки', ['Мойка керамическая'])
      ]
    }),
    makeGroup(KUHONNYE_MOYKI, [KUHONNYE_MOYKI], { isDefault: true })
  ]),
  makeRoot(IZMELCHITELI, [
    makeGroup('Измельчители пищевых отходов', [IZMELCHITELI], {
      leaves: [makeLeaf('Измельчители пищевых отходов', ['Измельчитель пищевых отходов'])]
    }),
    makeGroup(IZMELCHITELI, [IZMELCHITELI], { isDefault: true })
  ]),
  makeRoot(ZAPCHASTI_TEHNIKA, [
    makeGroup('Аксессуары для техники и вытяжек', [ZAPCHASTI_TEHNIKA], {
      leaves: [
        makeLeaf('Аксессуары для холодильников', ['Аксессуары для холодильников']),
        makeLeaf('Аксессуары для варочных поверхностей', ['Аксессуары для варочных поверхностей']),
        makeLeaf('Аксессуары для духовых шкафов', ['Аксессуары для духовых шкафов']),
        makeLeaf('Аксессуары для стиральных и сушильных машин', [
          'Аксессуары для стиральных и сушильных машин'
        ]),
        makeLeaf('Аксессуары для посудомоечных машин', ['Аксессуары для посудомоечных машин']),
        makeLeaf('Аксессуары для винных шкафов', ['Аксессуары для винных шкафов']),
        makeLeaf('Запчасти и аксессуары для вытяжек', ['Запчасти и аксессуары для вытяжек']),
        makeLeaf('Фильтры для вытяжек', [
          'Фильтр угольный для вытяжки',
          'Фильтр жировой для вытяжки'
        ]),
        makeLeaf('Багеты и планки для вытяжек', ['Багеты и планки для вытяжек']),
        makeLeaf('Пульты для вытяжек', ['Пульт для вытяжки']),
        makeLeaf('Аксессуары для МБТ', ['Аксессуары для мбт']),
        makeLeaf('Аксессуары для пылесосов', ['Аксессуары для пылесосов']),
        makeLeaf('Аксессуары для кофемашин', ['Аксессуары для кофемашин', 'Фильтр для кофемашины'])
      ]
    }),
    makeGroup(ZAPCHASTI_TEHNIKA, [ZAPCHASTI_TEHNIKA], { isDefault: true })
  ]),
  makeRoot(ZAPCHASTI_MOYKI, [
    makeGroup('Аксессуары для кухни и выдвижные системы', [ZAPCHASTI_MOYKI]),
    makeGroup('Аксессуары для моек и смесителей', [ZAPCHASTI_MOYKI], {
      leaves: [
        makeLeaf('Аксессуары для моек', ['Аксессуары для кухонных моек']),
        makeLeaf('Аксессуары для смесителей', ['Аксессуары для смесителей'])
      ]
    }),
    makeGroup('Кухонные принадлежности', [ZAPCHASTI_MOYKI], {
      leaves: [makeLeaf('Кухонные принадлежности', ['Кухонные принадлежности'])]
    }),
    makeGroup('Фильтры для воды и комплектующие', [ZAPCHASTI_MOYKI], {
      leaves: [makeLeaf('Фильтры для воды', ['Фильтр для воды'])]
    }),
    makeGroup(ZAPCHASTI_MOYKI, [ZAPCHASTI_MOYKI], { isDefault: true })
  ]),
  makeRoot(KLIMAT, [
    makeGroup('Водонагреватели', [KLIMAT], {
      leaves: [
        makeLeaf('Накопительные', ['Водонагреватель накопительный']),
        makeLeaf('Проточные', ['Водонагреватель проточный'])
      ]
    }),
    makeGroup('Воздухоочистители и увлажнители', [KLIMAT], {
      leaves: [makeLeaf('Осушители воздуха', ['Осушитель воздуха'])]
    }),
    makeGroup('Климатическая техника', [KLIMAT], {
      leaves: [
        makeLeaf('Вентиляторы', ['Вентилятор']),
        makeLeaf('Конвекторы', ['Конвектор']),
        makeLeaf('Обогреватели', ['Обогреватель']),
        makeLeaf('Фанкойлы', ['Фанкойл'])
      ]
    }),
    makeGroup('Кондиционеры', [KLIMAT], { leaves: [] }),
    makeGroup(KLIMAT, [KLIMAT], { isDefault: true })
  ]),
  makeRoot(SMESITELI, [
    makeGroup('Смесители', [SMESITELI], {
      leaves: [
        makeLeaf('Комплекты смеситель + фильтр', ['Комплект смеситель + фильтр']),
        makeLeaf('Краны для питьевой воды', ['Кран для питьевой воды']),
        makeLeaf('Смесители «под гранит»', ['Смеситель «под гранит»', 'Смеситель "под гранит"']),
        makeLeaf('Смесители из металла', ['Смеситель из металла']),
        makeLeaf('Смесители хром/гранит', ['Смеситель хром/гранит'])
      ]
    }),
    makeGroup(SMESITELI, [SMESITELI], { isDefault: true })
  ]),
  makeRoot(PROF, [
    makeGroup('Холодильное оборудование', [PROF], {
      leaves: [
        makeLeaf('Для сухого вызревания мяса', ['Холодильник для сухого вызревания мяса']),
        makeLeaf('Однокамерные холодильники', ['Однокамерный холодильник встраиваемый'])
      ]
    }),
    makeGroup('Прачечное оборудование', [PROF], {
      leaves: [
        makeLeaf('Стиральные машины', ['Стиральная машина с фронтальной загрузкой']),
        makeLeaf('Сушильные машины', ['Сушильная машина отдельностоящая'])
      ]
    }),
    makeGroup('Тепловое оборудование', [PROF], {
      leaves: [
        makeLeaf('Конвекционные печи', ['Печь конвекционная']),
        makeLeaf('Духовые шкафы', ['Электрический духовой шкаф'])
      ]
    }),
    makeGroup('Посудомоечное оборудование', [PROF], {
      leaves: [makeLeaf('Стаканомоечные машины', ['Стаканомоечная машина отдельностоящая'])]
    }),
    makeGroup(PROF, [PROF], { isDefault: true })
  ])
];

const showcaseConfig = [
  {
    name: 'Бытовая техника',
    roots: [
      'Встраиваемая техника',
      'Кухонные вытяжки',
      'Крупная бытовая техника',
      'Мелкая бытовая техника',
      'Климатическая техника',
      'Запчасти и аксессуары для техники'
    ]
  },
  {
    name: 'Мойки, смесители, мусорные системы и аксессуары',
    roots: [
      'Запчасти для моек, смесителей, измельчителей и мусорных систем',
      'Кухонные мойки',
      'Смесители',
      'Измельчители пищевых отходов'
    ]
  },
  {
    name: 'Профессиональная техника',
    roots: ['Профессиональная техника']
  }
] as const;

export function findCatalogRootBySlug(
  rootSlug: string | null | undefined,
  roots: CatalogRoot[] = catalogTree
) {
  if (!rootSlug) return null;
  return roots.find((root) => root.slug === rootSlug) ?? null;
}

export function findCatalogGroupBySlug(
  root: CatalogRoot | null | undefined,
  groupSlug: string | null | undefined
) {
  if (!root || !groupSlug) return null;
  return root.groups.find((group) => group.slug === groupSlug) ?? null;
}

export function findCatalogLeafBySlug(
  group: CatalogGroup | null | undefined,
  leafSlug: string | null | undefined
) {
  if (!group || !leafSlug) return null;
  return group.leaves.find((leaf) => leaf.slug === leafSlug) ?? null;
}

export function resolveCatalog(
  category: string | null | undefined,
  productType: string | null | undefined
): ResolvedCatalog {
  const normalizedCategory = normalize(category);

  for (const root of catalogTree) {
    for (const group of root.groups) {
      const inCategory = group.categories.some((item) => normalize(item) === normalizedCategory);
      if (!inCategory) continue;
      for (const leaf of group.leaves) {
        if (leafMatchesProductType(leaf, productType)) {
          return {
            root: { slug: root.slug, name: root.name },
            group: { slug: group.slug, name: group.name },
            leaf: { slug: leaf.slug, name: leaf.name }
          };
        }
      }
      if (group.isDynamicByProductType && groupMatchesProductType(group, productType)) {
        return {
          root: { slug: root.slug, name: root.name },
          group: { slug: group.slug, name: group.name },
          leaf: null
        };
      }
    }
  }

  for (const root of catalogTree) {
    const defaultGroup = root.groups.find(
      (group) =>
        group.isDefault && group.categories.some((item) => normalize(item) === normalizedCategory)
    );
    if (defaultGroup) {
      return {
        root: { slug: root.slug, name: root.name },
        group:
          defaultGroup.name === root.name
            ? null
            : { slug: defaultGroup.slug, name: defaultGroup.name },
        leaf: null
      };
    }
  }

  if (category) {
    return {
      root: { slug: slugify(category), name: String(category).trim() },
      group: null,
      leaf: null
    };
  }

  return { root: null, group: null, leaf: null };
}

export function getCatalogRoots() {
  return catalogTree;
}

export function filterCatalogRootsByAvailability(
  roots: CatalogRoot[],
  rows: CatalogAvailabilityRow[]
): CatalogRoot[] {
  const rootSet = new Set(rows.map((row) => row.root_slug).filter(Boolean));
  const leafSet = new Set(rows.map((row) => row.leaf_slug).filter(Boolean));

  return roots
    .filter((root) => rootSet.has(root.slug))
    .map((root) => {
      const hasRootLevelProducts = rows.some(
        (row) => row.root_slug === root.slug && !row.group_slug && !row.leaf_slug
      );

      const groups = root.groups
        .map((group) => ({
          ...group,
          leaves: group.leaves.filter((leaf) => leafSet.has(leaf.slug))
        }))
        .filter((group) => {
          const keepDefaultRootGroup = !!group.isDefault && hasRootLevelProducts;
          return group.leaves.length > 0 || keepDefaultRootGroup;
        });

      return { ...root, groups };
    })
    .filter((root) => root.groups.length > 0);
}

export function getCatalogNav(
  pathname: string,
  roots: CatalogRoot[] = catalogTree
): CatalogNavItem[] {
  const pathSegments = pathname.split('/').filter(Boolean);
  if (pathSegments[0] !== 'catalog') return [];
  if (pathSegments[1] === 'search') return [];

  const [rootSlug, groupSlug] = pathSegments.slice(1);
  if (!rootSlug) return [];

  const root = roots.find((item) => item.slug === rootSlug);
  if (!root) return [];

  if (!groupSlug) {
    return root.groups
      .filter((group) => !group.isDefault)
      .map((group) => ({
        name: group.name,
        slug: group.slug,
        href: `/catalog/${root.slug}/${group.slug}`,
        level: 'group' as const
      }));
  }

  const group = root.groups.find((item) => item.slug === groupSlug);
  if (!group) return [];

  return group.leaves.map((leaf) => ({
    name: leaf.name,
    slug: leaf.slug,
    href: `/catalog/${root.slug}/${group.slug}/${leaf.slug}`,
    level: 'leaf' as const
  }));
}

export function getCatalogShowcase(roots: CatalogRoot[] = catalogTree): CatalogShowcaseSection[] {
  return showcaseConfig
    .map((section) => {
      const items = section.roots
        .map((rootName) => {
          const root = roots.find((item) => item.name === rootName);
          if (!root) return null;
          return {
            name: root.name,
            slug: root.slug,
            href: `/catalog/${root.slug}`
          };
        })
        .filter(Boolean) as CatalogShowcaseSection['items'];

      return {
        slug: slugify(section.name),
        name: section.name,
        items
      };
    })
    .filter((section) => section.items.length > 0);
}

export function slugifyCatalogValue(value: string) {
  return slugify(value);
}
