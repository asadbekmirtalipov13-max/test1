export interface District {
  id: string;
  name: {
    ru: string;
    uz: string;
    en: string;
  };
}

export interface Region {
  id: string;
  name: {
    ru: string;
    uz: string;
    en: string;
  };
  districts: District[];
}

export const uzbekistanRegions: Region[] = [
  {
    id: 'tashkent_city',
    name: { ru: 'г. Ташкент', uz: 'Toshkent shahri', en: 'Tashkent City' },
    districts: [
      { id: 'bektemir', name: { ru: 'Бектемирский р-н', uz: 'Bektemir tumani', en: 'Bektemir district' } },
      { id: 'chilanzar', name: { ru: 'Чиланзарский р-н', uz: 'Chilonzor tumani', en: 'Chilanzar district' } },
      { id: 'yashnabad', name: { ru: 'Яшнабадский р-н', uz: 'Yashnobod tumani', en: 'Yashnabad district' } },
      { id: 'mirabad', name: { ru: 'Мирабадский р-н', uz: 'Mirobod tumani', en: 'Mirabad district' } },
      { id: 'mirzo_ulugbek', name: { ru: 'Мирзо-Улугбекский р-н', uz: 'Mirzo Ulug‘bek tumani', en: 'Mirzo Ulugbek district' } },
      { id: 'sergeli', name: { ru: 'Сергелийский р-н', uz: 'Sirg‘ali tumani', en: 'Sergeli district' } },
      { id: 'shaykhantakhur', name: { ru: 'Шайхантахурский р-н', uz: 'Shayxontohur tumani', en: 'Shaykhantakhur district' } },
      { id: 'almazar', name: { ru: 'Алмазарский р-н', uz: 'Olmazor tumani', en: 'Almazar district' } },
      { id: 'uchtepa', name: { ru: 'Учтепинский р-н', uz: 'Uchtepa tumani', en: 'Uchtepa district' } },
      { id: 'yakkasaray', name: { ru: 'Яккасарайский р-н', uz: 'Yakkasaroy tumani', en: 'Yakkasaray district' } },
      { id: 'yunusabad', name: { ru: 'Юнусабадский р-н', uz: 'Yunusobod tumani', en: 'Yunusabad district' } },
    ]
  },
  {
    id: 'tashkent_reg',
    name: { ru: 'Ташкентская область', uz: 'Toshkent viloyati', en: 'Tashkent Region' },
    districts: [
      { id: 'chirchiq', name: { ru: 'г. Чирчик', uz: 'Chirchiq shahri', en: 'Chirchik city' } },
      { id: 'angren', name: { ru: 'г. Ангрен', uz: 'Angren shahri', en: 'Angren city' } },
      { id: 'olmaliq', name: { ru: 'г. Алмалык', uz: 'Olmaliq shahri', en: 'Almalyk city' } },
      { id: 'zangiata', name: { ru: 'Зангиатинский р-н', uz: 'Zangiota tumani', en: 'Zangiata district' } },
      { id: 'kibray', name: { ru: 'Кибрайский р-н', uz: 'Qibray tumani', en: 'Kibray district' } },
    ]
  },
  {
    id: 'samarkand',
    name: { ru: 'Самаркандская область', uz: 'Samarqand viloyati', en: 'Samarkand Region' },
    districts: [
      { id: 'samarkand_city', name: { ru: 'г. Самарканд', uz: 'Samarqand shahri', en: 'Samarkand city' } },
      { id: 'pastdargom', name: { ru: 'Пастдаргомский р-н', uz: 'Pastdarg‘om tumani', en: 'Pastdargom district' } },
    ]
  },
  {
    id: 'bukhara',
    name: { ru: 'Бухарская область', uz: 'Buxoro viloyati', en: 'Bukhara Region' },
    districts: [
      { id: 'bukhara_city', name: { ru: 'г. Бухара', uz: 'Buxoro shahri', en: 'Bukhara city' } },
      { id: 'gijduvan', name: { ru: 'Гиждуванский р-н', uz: 'G‘ijduvon tumani', en: 'Gijduvan district' } },
    ]
  },
  {
    id: 'fergana',
    name: { ru: 'Ферганская область', uz: 'Farg‘ona viloyati', en: 'Fergana Region' },
    districts: [
      { id: 'fergana_city', name: { ru: 'г. Фергана', uz: 'Farg‘ona shahri', en: 'Fergana city' } },
      { id: 'kokand', name: { ru: 'г. Коканд', uz: 'Qo‘qon shahri', en: 'Kokand city' } },
    ]
  },
  {
    id: 'andijan',
    name: { ru: 'Андижанская область', uz: 'Andijon viloyati', en: 'Andijan Region' },
    districts: [
      { id: 'andijan_city', name: { ru: 'г. Андижан', uz: 'Andijon shahri', en: 'Andijan city' } },
      { id: 'asaka', name: { ru: 'Асакинский р-н', uz: 'Asaka tumani', en: 'Asaka district' } },
    ]
  },
  {
    id: 'namangan',
    name: { ru: 'Наманганская область', uz: 'Namangan viloyati', en: 'Namangan Region' },
    districts: [
      { id: 'namangan_city', name: { ru: 'г. Наманган', uz: 'Namangan shahri', en: 'Namangan city' } },
      { id: 'chust', name: { ru: 'Чустский р-н', uz: 'Chust tumani', en: 'Chust district' } },
    ]
  },
  {
    id: 'navoi',
    name: { ru: 'Навоийская область', uz: 'Navoiy viloyati', en: 'Navoi Region' },
    districts: [
      { id: 'navoi_city', name: { ru: 'г. Навои', uz: 'Navoiy shahri', en: 'Navoi city' } },
      { id: 'karmana', name: { ru: 'Карманинский р-н', uz: 'Karmana tumani', en: 'Karmana district' } },
    ]
  },
  {
    id: 'kashkadarya',
    name: { ru: 'Кашкадарьинская область', uz: 'Qashqadaryo viloyati', en: 'Kashkadarya Region' },
    districts: [
      { id: 'karshi', name: { ru: 'г. Карши', uz: 'Qarshi shahri', en: 'Karshi city' } },
      { id: 'shakhrisabz', name: { ru: 'г. Шахрисабз', uz: 'Shahrisabz shahri', en: 'Shakhrisabz city' } },
    ]
  },
  {
    id: 'surkhandarya',
    name: { ru: 'Сурхандарьинская область', uz: 'Surxondaryo viloyati', en: 'Surkhandarya Region' },
    districts: [
      { id: 'termiz', name: { ru: 'г. Термез', uz: 'Termiz shahri', en: 'Termez city' } },
      { id: 'denau', name: { ru: 'Денауский р-н', uz: 'Denov tumani', en: 'Denau district' } },
    ]
  },
  {
    id: 'jizzakh',
    name: { ru: 'Джизакская область', uz: 'Jizzax viloyati', en: 'Jizzakh Region' },
    districts: [
      { id: 'jizzakh_city', name: { ru: 'г. Джизак', uz: 'Jizzax shahri', en: 'Jizzakh city' } },
      { id: 'zaamin', name: { ru: 'Зааминский р-н', uz: 'Zomin tumani', en: 'Zaamin district' } },
    ]
  },
  {
    id: 'syrdarya',
    name: { ru: 'Сырдарьинская область', uz: 'Sirdaryo viloyati', en: 'Syrdarya Region' },
    districts: [
      { id: 'gulistan', name: { ru: 'г. Гулистан', uz: 'Guliston shahri', en: 'Gulistan city' } },
      { id: 'yangiyer', name: { ru: 'г. Янгиер', uz: 'Yangiyer shahri', en: 'Yangiyer city' } },
    ]
  },
  {
    id: 'khorezm',
    name: { ru: 'Хорезмская область', uz: 'Xorazm viloyati', en: 'Khorezm Region' },
    districts: [
      { id: 'urgench', name: { ru: 'г. Ургенч', uz: 'Urganch shahri', en: 'Urgench city' } },
      { id: 'khiva', name: { ru: 'г. Хива', uz: 'Xiva shahri', en: 'Khiva city' } },
    ]
  },
  {
    id: 'karakalpakstan',
    name: { ru: 'Республика Каракалпакстан', uz: 'Qoraqalpog‘iston Respublikasi', en: 'Republic of Karakalpakstan' },
    districts: [
      { id: 'nukus', name: { ru: 'г. Нукус', uz: 'Nukus shahri', en: 'Nukus city' } },
      { id: 'kungrad', name: { ru: 'Кунградский р-н', uz: 'Qo‘ng‘irot tumani', en: 'Kungrad district' } },
    ]
  }
];
