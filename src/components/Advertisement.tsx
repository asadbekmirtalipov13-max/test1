import { useSiteSettings } from '../context/SiteSettingsContext';

export default function Advertisement() {
  const { ad } = useSiteSettings();

  if (!ad.isActive) return null;

  return (
    <div className="bg-gray-100 border-y border-gray-200 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row items-center">
          {ad.imageUrl && (
            <div className="w-full md:w-1/3 h-48 md:h-auto">
              <img src={ad.imageUrl || undefined} alt="Advertisement" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-8 flex-1 text-center md:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-2 block">Реклама</span>
            <p className="text-xl font-medium text-blue-950 mb-6">{ad.text}</p>
            {ad.link && (
              <a 
                href={ad.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
              >
                Узнать больше
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
