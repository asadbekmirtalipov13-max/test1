import { ShieldCheck, Truck, PenTool, Award } from 'lucide-react';

const features = [
  {
    name: 'Собственное производство',
    description: 'Изготавливаем оборудование на собственных мощностях в Ташкенте. Контроль качества на каждом этапе.',
    icon: PenTool,
  },
  {
    name: 'Доставка по Узбекистану',
    description: 'Оперативная доставка и монтаж в любом регионе республики. Работаем с государственными и частными заказчиками.',
    icon: Truck,
  },
  {
    name: 'Соответствие нормативам',
    description: 'Вся продукция соответствует строительным нормам и правилам РУз. Предоставляем полный пакет документов.',
    icon: ShieldCheck,
  },
  {
    name: 'Гарантия и сервис',
    description: 'Официальная гарантия на металлоконструкции и механизмы. Постгарантийное обслуживание.',
    icon: Award,
  },
];

export default function Features() {
  return (
    <div className="bg-white py-12 sm:py-16 lg:py-20" id="about">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:text-center">
          <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Наши преимущества</h2>
          <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-blue-950 sm:text-4xl">
            Профессиональный подход к доступной среде
          </p>
          <p className="mt-4 max-w-2xl text-xl text-blue-400 lg:mx-auto">
            Как производитель, мы гарантируем лучшие цены и возможность реализации нестандартных проектов любой сложности.
          </p>
        </div>

        <div className="mt-10">
          <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-8 md:gap-y-10">
            {features.map((feature) => (
              <div key={feature.name} className="relative bg-gray-50 p-6 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all">
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-blue-600 text-white shadow-sm">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <p className="ml-16 text-lg leading-6 font-bold text-blue-950">{feature.name}</p>
                </dt>
                <dd className="mt-2 ml-16 text-base text-gray-600">{feature.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
