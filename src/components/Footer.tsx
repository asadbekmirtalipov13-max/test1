import { useLanguage } from '../context/LanguageContext';
import { Phone, MapPin, Mail, Instagram, MessageCircle, CreditCard, Facebook, Youtube } from 'lucide-react';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { motion } from 'motion/react';

export default function Footer() {
  const { t, language } = useLanguage();
  const { contacts, siteName, bannerUrl, footerImageUrl, paymentMethodsList, socialLinks } = useSiteSettings();

  return (
    <div className="flex flex-col">
      {/* Banner / Footer Image placed right above footer */}
      {(bannerUrl || footerImageUrl) && (
        <div className="w-full bg-gray-100 flex justify-center py-4">
          <img src={footerImageUrl || bannerUrl} alt="Banner" className="w-full max-w-7xl h-auto object-contain" />
        </div>
      )}

      <footer className="bg-white text-gray-900 pt-20 pb-12 border-t border-gray-100" id="contact">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div>
              <h3 className="text-2xl font-black text-primary mb-6 uppercase tracking-tight">{siteName}</h3>
              <p className="text-gray-500 mb-8 leading-relaxed">
                {t('hero.title')}
              </p>
              <div className="flex flex-wrap gap-4">
                {socialLinks?.map((link) => (
                  <motion.a 
                    key={link.id}
                    whileHover={{ scale: 1.1 }}
                    href={link.url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-gray-50 hover:shadow-lg transition-all duration-300"
                    title={link.name}
                  >
                    {link.iconUrl ? (
                      <img src={link.iconUrl} alt={link.name} className="w-full h-full object-cover" />
                    ) : (
                      <MessageCircle className="w-6 h-6 text-primary" />
                    )}
                  </motion.a>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-black text-gray-900 mb-8 border-b-2 border-primary/20 pb-2 inline-block uppercase tracking-wider">{t('nav.contacts')}</h4>
              <ul className="space-y-5">
                <li className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-gray-50 text-primary border border-gray-100">
                    <MapPin className="w-5 h-5 flex-shrink-0" />
                  </div>
                  <span className="text-gray-600 font-medium leading-snug">{contacts?.address?.[language]}</span>
                </li>
                <li className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-gray-50 text-primary border border-gray-100">
                    <Phone className="w-5 h-5 flex-shrink-0" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{t('contact.phone')}</span>
                    <a href={`tel:${contacts?.phone?.replace(/[^0-9+]/g, '')}`} className="text-gray-900 font-bold hover:text-primary transition-colors text-lg">{contacts?.phone}</a>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-gray-50 text-primary border border-gray-100">
                    <Mail className="w-5 h-5 flex-shrink-0" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Email</span>
                    <a href={`mailto:${contacts?.email}`} className="text-gray-900 font-bold hover:text-primary transition-colors">{contacts?.email}</a>
                  </div>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-black text-gray-900 mb-8 border-b-2 border-primary/20 pb-2 inline-block uppercase tracking-wider">{language === 'ru' ? 'Режим работы' : 'Ish vaqti'}</h4>
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100 italic text-gray-600 font-medium leading-relaxed">
                 {contacts?.workingHours?.[language]}
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-black text-gray-900 mb-8 border-b-2 border-primary/20 pb-2 inline-block uppercase tracking-wider">{language === 'ru' ? 'Способы оплаты' : 'To\'lov usullari'}</h4>
              <div className="flex flex-wrap gap-3">
                {paymentMethodsList?.map(pm => (
                  <div key={pm.id} className="p-3 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center gap-2 hover:border-primary transition-colors cursor-default">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700 text-xs font-black uppercase tracking-wide">{pm.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-100 pt-10 text-center text-gray-400 text-sm font-medium">
            <p>&copy; {new Date().getFullYear()} {siteName}. {t('footer.rights')}.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
