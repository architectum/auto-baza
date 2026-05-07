import { useState } from 'react';
import { HelpCircle, X, CheckCircle, Car, Search, Plus, Wrench, Settings as SettingsIcon, LayoutTemplate, Mic, Camera } from 'lucide-react';

export function InstructionSheet() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        id="instruction-btn"
        onClick={() => setOpen(true)}
        className="w-10 h-10 flex items-center justify-center rounded-xl t-text-secondary transition-all active:scale-95"
        style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-muted)' }}
        title="Інструкція"
      >
        <HelpCircle className="w-5 h-5" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 animate-fade-in"
          style={{ background: 'var(--t-surface-overlay)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sheet */}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${open ? 'translate-y-0' : 'translate-y-full'
          }`}
        style={{ maxHeight: '90dvh' }}
      >
        <div
          className="rounded-t-3xl border-t safe-bottom overflow-y-auto flex flex-col"
          style={{
            background: 'var(--t-surface-card)',
            borderColor: 'var(--t-border-default)',
            maxHeight: '90dvh',
          }}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div
              className="w-10 h-1 rounded-full"
              style={{ background: 'var(--t-border-default)' }}
            />
          </div>

          <div className="px-5 pb-8 overflow-y-auto flex-1 custom-scrollbar">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-opacity-90 py-2 z-10" style={{ background: 'var(--t-surface-card)' }}>
              <h2
                className="text-xl font-bold flex items-center gap-2"
                style={{ color: 'var(--t-text-primary)' }}
              >
                <HelpCircle className="w-6 h-6 t-text-accent" />
                Інструкція
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0"
                style={{ background: 'var(--t-surface-elevated)', color: 'var(--t-text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-6 text-sm" style={{ color: 'var(--t-text-secondary)' }}>

              {/* Section 1 */}
              <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
                <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient" style={{ color: 'var(--t-text-on-accent)' }}>1</div>
                  Вхід у додаток
                </h3>
                <p>
                  Відкрийте додаток і натисніть кнопку <strong style={{ color: 'var(--t-text-primary)' }}>«Увійти через Google»</strong>. Виберіть свій Google-акаунт. Всі ваші дані (авто та їх історія) будуть прив'язані виключно до вашого акаунта.
                </p>
              </section>

              {/* Section 2 */}
              <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
                <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient" style={{ color: 'var(--t-text-on-accent)' }}>2</div>
                  Головний екран (Список авто)
                </h3>
                <p>
                  На головному екрані ви бачите список всіх доданих автомобілів.
                </p>
                <ul className="space-y-2 list-none pl-1">
                  <li className="flex gap-2">
                    <Search className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                    <span>Для <strong>пошуку</strong> скористайтеся рядком зверху — можна шукати за номерним знаком, ім'ям клієнта чи номером телефону.</span>
                  </li>
                  <li className="flex gap-2">
                    <Plus className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                    <span>Щоб <strong>додати нове авто</strong>, натисніть круглу кнопку <strong>«+»</strong> у правому нижньому куті екрана.</span>
                  </li>
                </ul>
              </section>

              {/* Section 3 */}
              <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
                <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient" style={{ color: 'var(--t-text-on-accent)' }}>3</div>
                  Додавання нового авто
                </h3>
                <p>При додаванні авто ви перейдете на форму створення профілю:</p>
                <ul className="space-y-3 list-none pl-1">
                  <li className="flex gap-2">
                    <Car className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                    <span><strong>Заповнення вручну:</strong> Ви можете вручну ввести номер, марку, модель, вказати рік, обрати колір, тип кузова та записати контакти клієнта.</span>
                  </li>
                  <li className="flex gap-2">
                    <Camera className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                    <span><strong>Магія ШІ (Фото):</strong> Натисніть іконку камери у блоці «Автозаповнення AI», зробіть фото авто або завантажте його з галереї. Додаток сам розпізнає номер, марку і модель.</span>
                  </li>
                  <li className="flex gap-2">
                    <Mic className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                    <span><strong>Магія ШІ (Голос):</strong> Натисніть іконку мікрофона, продиктуйте: <em>"Тойота Камрі чорного кольору, седан, 2018 року, номер АХ 1234 ВВ, клієнт Олексій, телефон 050 123 45 67"</em>. Асистент сам заповнить усі поля!</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                    <span>Натисніть <strong>«Зберегти дані авто»</strong>, щоб створити запис.</span>
                  </li>
                </ul>
              </section>

              {/* Section 4 */}
              <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
                <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient" style={{ color: 'var(--t-text-on-accent)' }}>4</div>
                  Історія обслуговування
                </h3>
                <p>Натисніть на будь-яке авто зі списку, щоб відкрити його картку. Внизу знаходиться блок <strong>«Історія»</strong>:</p>
                <ul className="space-y-3 list-none pl-1">
                  <li className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 bg-blue-500" />
                    <span><strong>Оновлення пробігу:</strong> Натисніть кнопку <strong>«Пробіг»</strong> над записами, щоб швидко ввести новий кілометраж. Додаток автоматично вирахує різницю з попереднім значенням.</span>
                  </li>
                  <li className="flex gap-2">
                    <Mic className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                    <span><strong>Додавання робіт голосом:</strong> Унизу екрана є панель <strong>«Надиктувати запис»</strong>. Натисніть на мікрофон і скажіть, наприклад: <em>"Поміняли масло і фільтри, пробіг 145 тисяч"</em>. ШІ автоматично розпізнає це як "Рішення", виокремить пробіг та створить запис.</span>
                  </li>
                  <li className="flex gap-2">
                    <Wrench className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                    <span>Записи автоматично сортуються від найновіших до найстаріших і мають кольорове кодування (Проблема, Рішення, Нотатка, Пробіг).</span>
                  </li>
                </ul>
              </section>

              {/* Section 5 */}
              <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
                <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient" style={{ color: 'var(--t-text-on-accent)' }}>5</div>
                  Налаштування додатку
                </h3>
                <p>Натисніть на іконку <strong>шестірні (⚙️)</strong> у правому верхньому куті головного екрана:</p>
                <ul className="space-y-2 list-none pl-1">
                  <li className="flex gap-2">
                    <SettingsIcon className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                    <span>Змінюйте тему (Світла / Темна).</span>
                  </li>
                  <li className="flex gap-2">
                    <SettingsIcon className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                    <span>Обирайте колірний акцент додатку під свій смак.</span>
                  </li>
                  <li className="flex gap-2">
                    <SettingsIcon className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                    <span>З налаштувань також можна вийти з акаунта.</span>
                  </li>
                </ul>
              </section>

              {/* Section 6 */}
              <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
                <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient" style={{ color: 'var(--t-text-on-accent)' }}>6</div>
                  Встановлення як додаток (PWA)
                </h3>
                <p>Якщо ви відкрили застосунок у браузері на телефоні:</p>
                <ul className="space-y-2 list-none pl-1">
                  <li className="flex gap-2">
                    <LayoutTemplate className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                    <span><strong>Android (Chrome):</strong> Натисніть на меню браузера (⋮) і виберіть <em>"Додати на головний екран"</em> або <em>"Встановити додаток"</em>.</span>
                  </li>
                  <li className="flex gap-2">
                    <LayoutTemplate className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                    <span><strong>iOS (Safari):</strong> Натисніть кнопку "Поділитися" (квадрат зі стрілочкою) і виберіть <em>"На початковий екран"</em>.</span>
                  </li>
                </ul>
                <p className="mt-2 font-medium" style={{ color: 'var(--t-text-primary)' }}>
                  Тепер АвтоЕлектрик буде виглядати і працювати як звичайний мобільний додаток, без адресного рядка браузера!
                </p>
              </section>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}
