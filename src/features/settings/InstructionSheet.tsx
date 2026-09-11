import { useState } from 'react';
import { 
  HelpCircle, CheckCircle, Car, Search, Plus, Wrench, Settings as SettingsIcon, 
  LayoutTemplate, Mic, Camera, Link2, FileText, BrainCircuit, BarChart3, 
  LogOut, Phone, Sparkles, WifiOff, Download, Activity, Paperclip, AlertCircle 
} from '@shared/icons/Icons';
import { BottomSheet } from '@shared/ui/BottomSheet';
import { Button } from '@shared/ui/Button';

export function InstructionSheet() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="icon"
        size="md"
        id="instruction-btn"
        onClick={() => setOpen(true)}
        title="Інструкція"
        style={{ color: 'var(--t-text-muted)' }}
      >
        <HelpCircle className="w-5 h-5" />
      </Button>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Інструкція користувача"
        maxHeight="90dvh"
      >
        <div className="space-y-6 text-sm pb-6" style={{ color: 'var(--t-text-secondary)' }}>

          {/* Section 1 */}
          <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient font-bold" style={{ color: 'var(--t-text-on-accent)' }}>1</div>
              Вхід та безпека даних
            </h3>
            <p>
              Відкрийте додаток і натисніть кнопку <strong style={{ color: 'var(--t-text-primary)' }}>«Увійти через Google»</strong>. Усі ваші дані (список автомобілів, історія обслуговування, контакти клієнтів та файли) надійно захищені в хмарі та прив'язані виключно до вашого Google-акаунта.
            </p>
            <p className="flex items-center gap-2 text-xs" style={{ color: 'var(--t-text-muted)' }}>
              <LogOut className="w-4 h-4 shrink-0 t-text-accent" />
              <span>Швидкий вихід з акаунта доступний кнопкою у правому верхньому куті головного екрана.</span>
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient font-bold" style={{ color: 'var(--t-text-on-accent)' }}>2</div>
              Головний екран (Список авто)
            </h3>
            <p>
              Тут зібрані всі збережені автомобілі з короткою інформацією та статусом ремонту:
            </p>
            <ul className="space-y-2.5 list-none pl-1">
              <li className="flex gap-2">
                <Search className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Пошук авто:</strong> Рядок пошуку дозволяє миттєво знайти автомобіль за номерним знаком, маркою, моделлю, ім'ям або номером телефону клієнта.</span>
              </li>
              <li className="flex gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--t-status-problem)' }} />
                <span><strong>Бейджі несправностей:</strong> На кожній картці відображається кількість відкритих проблем (червоний колір) та вже вирішених несправностей (зелений колір).</span>
              </li>
              <li className="flex gap-2">
                <Phone className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--t-status-solution)' }} />
                <span><strong>Дзвінок клієнту:</strong> Кнопка слухавки в профілі авто дозволяє зателефонувати власнику в один дотик.</span>
              </li>
              <li className="flex gap-2">
                <Plus className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Додати авто:</strong> Кругла кнопка «+» у правому нижньому куті відкриває форму додавання нового автомобіля.</span>
              </li>
              <li className="flex gap-2">
                <BarChart3 className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Панель шапки:</strong> Зверху розташовані перехід до розділу статистики, інструкція, налаштування зовнішнього вигляду та кнопка виходу.</span>
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient font-bold" style={{ color: 'var(--t-text-on-accent)' }}>3</div>
              Створення та налаштування авто
            </h3>
            <p>При додаванні або редагуванні авто доступні розумні інструменти заповнення:</p>
            <ul className="space-y-3 list-none pl-1">
              <li className="flex gap-2">
                <Car className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Номерні знаки та стиль:</strong> Оберіть країну, тип номера (стандартний білий, зелений для електромобілів, волонтерський, чорний військовий, жовтий таксі або транзитний) та формат (довгий європейський або квадратний американський). Реалістичне прев'ю оновлюється наживо!</span>
              </li>
              <li className="flex gap-2">
                <Camera className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Автозаповнення з фото (AI):</strong> Зробіть фото авто або завантажте з галереї. Штучний інтелект самостійно розпізнає номер, марку та модель.</span>
              </li>
              <li className="flex gap-2">
                <Mic className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Голосове введення авто (AI):</strong> Натисніть мікрофон у блоці авто і продиктуйте марку та модель (наприклад: <em>"Фольксваген Пассат"</em>).</span>
              </li>
              <li className="flex gap-2">
                <Mic className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Голосове введення клієнта (AI):</strong> Окремий мікрофон у блоці інформації про клієнта дозволяє надиктувати контакти (наприклад: <em>"Сергій, 050 123 45 67"</em>). Додаток сам виділить ім'я та відформатує номер телефону.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Перевірка дублікатів:</strong> Якщо автомобіль із таким номером уже збережено, система попередить вас та запропонує одразу відкрити існуючу картку.</span>
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient font-bold" style={{ color: 'var(--t-text-on-accent)' }}>4</div>
              Історія обслуговування та ремонти
            </h3>
            <p>У профілі кожного авто ведеться детальний журнал виконаних робіт:</p>
            <ul className="space-y-3 list-none pl-1">
              <li className="flex gap-2">
                <Activity className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--t-status-mileage)' }} />
                <span><strong>Обов'язковий пробіг:</strong> Для початку ведення журналу спочатку внесіть поточний пробіг кнопкою <strong>«Додати пробіг»</strong>. Усі наступні ремонти автоматично прив'язуються до кілометражу.</span>
              </li>
              <li className="flex gap-2">
                <Mic className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Надиктовка робіт голосом:</strong> Нижня панель <strong>«Надиктувати запис»</strong> дозволяє продиктувати роботу (наприклад: <em>"Заміна мастила та фільтрів, 2500 грн, пробіг 160 тисяч"</em>). ШІ визначить тип, вартість і зафіксує запис.</span>
              </li>
              <li className="flex gap-2">
                <Wrench className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Ручне додавання записів:</strong> Оберіть тип запису — <strong>Нотатка</strong> (сіра), <strong>Проблема</strong> (червона), <strong>Рішення</strong> (зелене) або <strong>Нагадування</strong> (бурштинове). Можна вказати вартість запчастин/робіт, витрачений час та складність ремонту.</span>
              </li>
              <li className="flex gap-2">
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>💡 Підказки AI для проблем:</strong> Натисніть кнопку «💡 Підказки AI» під невирішеною проблемою — ШІ проаналізує симптоми авто та запропонує можливі варіанти ремонту. Будь-яку підказку можна створити як рішення в один клік!</span>
              </li>
              <li className="flex gap-2">
                <Paperclip className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Прикріплення фото:</strong> До кожного запису можна прикріпити до 5 фотографій (чеки, фото деталей, дефектів чи результатів робіт) із переглядом на весь екран.</span>
              </li>
              <li className="flex gap-2">
                <Link2 className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Зв'язок "Проблема-Рішення":</strong> Натисніть на незв'язаний запис проблеми або рішення, а потім на іконку ланцюга поруч. Виберіть відповідну пару — між ними з'явиться візуальна лінія зв'язку. Для видалення зв'язку натисніть на лінію.</span>
              </li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient font-bold" style={{ color: 'var(--t-text-on-accent)' }}>5</div>
              Файли діагностики та AI аналіз
            </h3>
            <p>Зберігайте повну технічну документацію та звіти діагностики:</p>
            <ul className="space-y-3 list-none pl-1">
              <li className="flex gap-2">
                <FileText className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Завантаження звітів:</strong> Додавайте PDF-файли та документи діагностичних сканерів безпосередньо у картку автомобіля (до 10 МБ).</span>
              </li>
              <li className="flex gap-2">
                <BrainCircuit className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Аналіз за допомогою AI:</strong> Натисніть на доданий документ і оберіть «Проаналізувати за допомогою AI». ШІ розшифрує технічні коди помилок та складе зрозумілий звіт про технічний стан авто.</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Збереження та поширення:</strong> Готові аналізи зберігаються в базі, їх можна завантажити або поділитися з клієнтом через кнопку «Поділитися».</span>
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient font-bold" style={{ color: 'var(--t-text-on-accent)' }}>6</div>
              Аналітика, статистика та експорт у PDF
            </h3>
            <p>
              Натисніть іконку графіка у шапці головного екрана, щоб перейти до розділу аналітики:
            </p>
            <ul className="space-y-2.5 list-none pl-1">
              <li className="flex gap-2">
                <BarChart3 className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Періоди перегляду:</strong> Фільтруйте дані за День, Тиждень, Місяць або за Весь період ведення бази.</span>
              </li>
              <li className="flex gap-2">
                <BarChart3 className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Показники та графіки:</strong> Відстежуйте загальну суму витрат, кількість вирішених та відкритих проблем, витрачені години, розподіл за складністю робіт та прогноз витрат.</span>
              </li>
              <li className="flex gap-2">
                <Download className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Офіційний PDF-звіт:</strong> Кнопка «PDF» формує презентабельний фірмовий документ зі статистикою та переліком робіт, який зручно роздрукувати або надіслати клієнту.</span>
              </li>
              <li className="flex gap-2">
                <Download className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Експорт у CSV:</strong> Вивантажуйте дані для подальшого аналізу в Excel чи Google Таблицях.</span>
              </li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient font-bold" style={{ color: 'var(--t-text-on-accent)' }}>7</div>
              Зовнішній вигляд та теми
            </h3>
            <p>Натисніть на іконку шестірні у шапці головного екрана:</p>
            <ul className="space-y-2 list-none pl-1">
              <li className="flex gap-2">
                <SettingsIcon className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Режими теми:</strong> Обирайте між Світлою, Темною та <strong>AMOLED</strong> (глибокий чорний фон, що заощаджує батарею на смартфонах з OLED-дисплеями).</span>
              </li>
              <li className="flex gap-2">
                <SettingsIcon className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Колірні акценти:</strong> 7 вишуканих стилів оформлення (Blue Steel, Graphite Cyan, Emerald Noir, Arctic Indigo, Amber Flame, Rose Quartz, Violet Aurora).</span>
              </li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="space-y-3 p-4 rounded-2xl" style={{ background: 'var(--t-surface-elevated)' }}>
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--t-text-primary)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs t-accent-gradient font-bold" style={{ color: 'var(--t-text-on-accent)' }}>8</div>
              Встановлення (PWA) та робота офлайн
            </h3>
            <p>АвтоБаза підтримує роботу як повноцінний мобільний додаток:</p>
            <ul className="space-y-2 list-none pl-1">
              <li className="flex gap-2">
                <LayoutTemplate className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Android (Chrome):</strong> Відкрийте меню браузера (⋮) і оберіть <em>"Встановити додаток"</em> або <em>"Додати на головний екран"</em>.</span>
              </li>
              <li className="flex gap-2">
                <LayoutTemplate className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>iOS (Safari):</strong> Натисніть кнопку "Поділитися" (квадрат зі стрілкою) та виберіть <em>"На початковий екран"</em>.</span>
              </li>
              <li className="flex gap-2">
                <WifiOff className="w-4 h-4 mt-0.5 shrink-0 t-text-accent" />
                <span><strong>Робота без інтернету:</strong> Застосунок кешує дані для роботи офлайн. Ви можете переглядати інформацію та додавати нові записи навіть у гаражі без мережі — при появі зв'язку все синхронізується автоматично.</span>
              </li>
            </ul>
          </section>

        </div>
      </BottomSheet>
    </>
  );
}
