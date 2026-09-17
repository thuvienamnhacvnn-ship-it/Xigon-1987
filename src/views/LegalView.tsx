import { PageHead } from './PageHead';
import styles from './LegalView.module.css';
import viewStyles from './Views.module.css';
import { RESTAURANT, phoneHref } from '@/lib/restaurant';
import { tr, type Locale, type RouteKey } from '@/lib/i18n';
import type { Dictionary } from '@/lib/dictionary';

/**
 * The legal pages.
 *
 * The German Impressum has legally required contents — an operator, a legal
 * form, a VAT or tax number, a person responsible. The old site listed a name
 * and a tax number, neither of which anyone has confirmed is current. Publishing
 * an unverified Impressum is worse than publishing none: it is a false
 * declaration in the operator's name and it is the operator who is fined.
 *
 * So these pages state what is missing and who has to supply it, rather than
 * filling the gaps with plausible-looking text.
 */
export async function LegalView({
  locale,
  dict,
  kind,
}: {
  locale: Locale;
  dict: Dictionary;
  kind: Extract<RouteKey, 'imprint' | 'privacy' | 'orderTerms'>;
}) {
  const title =
    kind === 'imprint' ? dict.footer.imprint : kind === 'privacy' ? dict.footer.privacy : dict.footer.terms;

  return (
    <>
      <PageHead label={dict.footer.legal} title={title} />

      <div className={`section ${viewStyles.plain}`}>
        <div className="shell">
          <article className={styles.prose}>
            {kind === 'imprint' ? <Imprint locale={locale} /> : null}
            {kind === 'privacy' ? <Privacy locale={locale} /> : null}
            {kind === 'orderTerms' ? <Terms locale={locale} /> : null}
          </article>
        </div>
      </div>
    </>
  );
}

function Imprint({ locale }: { locale: Locale }) {
  return (
    <>
      <p className={styles.warn}>
        {tr(locale, {
          de: 'Dieses Impressum ist unvollständig. Die Angaben zum Betreiber wurden nicht bestätigt und dürfen vor der Freigabe durch das Restaurant nicht veröffentlicht werden.',
          en: 'This imprint is incomplete. The operator’s details have not been confirmed and must not be published before the restaurant releases them.',
          vi: 'Trang thông tin pháp lý này chưa đầy đủ. Thông tin chủ thể vận hành chưa được xác nhận và không được công bố trước khi nhà hàng duyệt.',
        })}
      </p>

      <h2>
        {tr(locale, { de: 'Anbieter', en: 'Operator', vi: 'Đơn vị vận hành' })}
      </h2>
      <p>
        {RESTAURANT.name}
        <br />
        {RESTAURANT.street}
        <br />
        {RESTAURANT.postalCode} {RESTAURANT.city}
      </p>

      <h2>{tr(locale, { de: 'Kontakt', en: 'Contact', vi: 'Liên hệ' })}</h2>
      <p>
        <a href={phoneHref(RESTAURANT.phone)}>{RESTAURANT.phone}</a>
        <br />
        <a href={`mailto:${RESTAURANT.email}`}>{RESTAURANT.email}</a>
      </p>

      <h2>{tr(locale, { de: 'Noch zu ergänzen', en: 'Still to be supplied', vi: 'Còn thiếu' })}</h2>
      <ul>
        {(
          [
            { de: 'Rechtsform und vertretungsberechtigte Person', en: 'Legal form and authorised representative', vi: 'Loại hình pháp lý và người đại diện' },
            { de: 'Registergericht und Registernummer, falls eingetragen', en: 'Register court and number, if registered', vi: 'Toà đăng ký và số đăng ký, nếu có' },
            { de: 'Umsatzsteuer-Identifikationsnummer nach § 27 a UStG', en: 'VAT identification number', vi: 'Mã số thuế giá trị gia tăng' },
            { de: 'Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV', en: 'Person responsible for content', vi: 'Người chịu trách nhiệm nội dung' },
            { de: 'Zuständige Aufsichtsbehörde (Lebensmittelüberwachung)', en: 'Competent supervisory authority (food safety)', vi: 'Cơ quan giám sát có thẩm quyền (an toàn thực phẩm)' },
          ] as const
        ).map((item) => (
          <li key={item.en}>{tr(locale, item)}</li>
        ))}
      </ul>
    </>
  );
}

function Privacy({ locale }: { locale: Locale }) {
  return (
    <>
      <p className={styles.warn}>
        {tr(locale, {
          de: 'Diese Erklärung beschreibt, was diese Anwendung technisch tut. Sie ersetzt keine juristische Prüfung und muss vor dem Livegang geprüft werden.',
          en: 'This statement describes what this application technically does. It is not a legal review and must be checked before going live.',
          vi: 'Bản này mô tả những gì ứng dụng thực sự làm về mặt kỹ thuật. Nó không thay cho rà soát pháp lý và phải được kiểm tra trước khi lên thật.',
        })}
      </p>

      <h2>{tr(locale, { de: 'Was gespeichert wird', en: 'What is stored', vi: 'Dữ liệu được lưu' })}</h2>
      <ul>
        <li>
          {tr(locale, {
            de: 'Reservierungen: Name, E-Mail, Telefonnummer, Datum, Uhrzeit, Personenzahl und Ihre Anmerkung.',
            en: 'Reservations: name, email, phone number, date, time, party size and your note.',
            vi: 'Đặt bàn: tên, e-mail, số điện thoại, ngày, giờ, số khách và ghi chú của quý khách.',
          })}
        </li>
        <li>
          {tr(locale, {
            de: 'Bestellungen: zusätzlich die Lieferadresse, falls Sie liefern lassen.',
            en: 'Orders: additionally the delivery address, if you order delivery.',
            vi: 'Đơn hàng: thêm địa chỉ giao, nếu quý khách chọn giao tận nơi.',
          })}
        </li>
        <li>
          {tr(locale, {
            de: 'Warenkorb: ein technisch notwendiges Cookie mit einer zufälligen Kennung. Kein Name, keine Adresse.',
            en: 'Cart: one technically necessary cookie holding a random identifier. No name, no address.',
            vi: 'Giỏ hàng: một cookie kỹ thuật bắt buộc chứa một mã ngẫu nhiên. Không tên, không địa chỉ.',
          })}
        </li>
      </ul>

      <h2>{tr(locale, { de: 'Externe Dienste', en: 'External services', vi: 'Dịch vụ bên ngoài' })}</h2>
      <p>
        {tr(locale, {
          de: 'Die Karte von OpenStreetMap wird erst geladen, wenn Sie sie anfordern. Bis dahin verlässt keine Anfrage Ihren Browser. Es ist kein Tracking, keine Analyse und keine Werbung eingebunden.',
          en: 'The OpenStreetMap map is loaded only when you ask for it. Until then no request leaves your browser. There is no tracking, no analytics and no advertising.',
          vi: 'Bản đồ OpenStreetMap chỉ tải khi quý khách bấm yêu cầu. Trước đó không có yêu cầu nào rời khỏi trình duyệt. Không theo dõi, không phân tích, không quảng cáo.',
        })}
      </p>

      <h2>{tr(locale, { de: 'Ihre Rechte', en: 'Your rights', vi: 'Quyền của quý khách' })}</h2>
      <p>
        {tr(locale, {
          de: 'Auskunft, Berichtigung, Löschung und Widerspruch nach DSGVO. Schreiben Sie uns dazu an die oben genannte Adresse.',
          en: 'Access, rectification, erasure and objection under the GDPR. Write to the address above.',
          vi: 'Quyền truy cập, đính chính, xoá và phản đối theo GDPR. Vui lòng viết cho chúng tôi theo địa chỉ ở trên.',
        })}
      </p>
    </>
  );
}

function Terms({ locale }: { locale: Locale }) {
  return (
    <>
      <p className={styles.warn}>
        {tr(locale, {
          de: 'Diese Anwendung läuft im Demo-Betrieb. Es wird keine Zahlung ausgelöst und keine Bestellung an die Küche übermittelt.',
          en: 'This application runs in demo mode. No payment is taken and no order reaches the kitchen.',
          vi: 'Ứng dụng đang chạy ở chế độ demo. Không có khoản thanh toán nào và không đơn nào tới bếp.',
        })}
      </p>

      <h2>{tr(locale, { de: 'Bestellung', en: 'Ordering', vi: 'Đặt món' })}</h2>
      <p>
        {tr(locale, {
          de: 'Eine Bestellung kommt zustande, wenn das Restaurant sie annimmt. Die angezeigte Uhrzeit ist der geplante Zeitpunkt, keine Zusage auf die Minute.',
          en: 'An order is formed when the restaurant accepts it. The time shown is the planned time, not a promise to the minute.',
          vi: 'Đơn hàng được xác lập khi nhà hàng nhận. Giờ hiển thị là giờ dự kiến, không phải cam kết đến từng phút.',
        })}
      </p>

      <h2>{tr(locale, { de: 'Preise', en: 'Prices', vi: 'Giá' })}</h2>
      <p>
        {tr(locale, {
          de: 'Alle Preise sind Bruttopreise und enthalten die gesetzliche Mehrwertsteuer. Die im Demo-Betrieb angezeigten Preise sind keine bestätigten Preise des Restaurants.',
          en: 'All prices are gross and include statutory VAT. The prices shown in demo mode are not the restaurant’s confirmed prices.',
          vi: 'Mọi giá là giá gồm thuế GTGT theo luật. Giá hiển thị ở chế độ demo không phải giá đã được nhà hàng xác nhận.',
        })}
      </p>

      <h2>{tr(locale, { de: 'Widerruf', en: 'Cancellation', vi: 'Huỷ đơn' })}</h2>
      <p>
        {tr(locale, {
          de: 'Für frisch zubereitete Speisen besteht kein Widerrufsrecht. Solange die Küche noch nicht begonnen hat, rufen Sie uns bitte an.',
          en: 'Freshly prepared food is not subject to a right of withdrawal. While the kitchen has not started, please call us.',
          vi: 'Món ăn chế biến tươi không thuộc diện được rút lại đơn. Khi bếp chưa bắt đầu, xin gọi cho chúng tôi.',
        })}
      </p>
    </>
  );
}
