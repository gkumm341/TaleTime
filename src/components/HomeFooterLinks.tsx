'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Shield, LifeBuoy, X } from 'lucide-react';
import { useI18n } from '@/components/LanguageProvider';
import type { Locale } from '@/i18n/routing';

type FooterContentKey =
  | 'terms'
  | 'conditions'
  | 'privacy'
  | 'faq'
  | 'contact'
  | 'safety';

type FooterContent = {
  title: string;
  body: ReactNode;
};

const LINK_ITEMS: FooterContentKey[] = ['terms', 'conditions', 'privacy', 'faq', 'contact', 'safety'];

const UI_TEXT: Record<
  Locale,
  {
    linkLabels: Record<FooterContentKey, string>;
    navLabel: string;
    modalSubtitle: string;
    quickReference: string;
    footerPrefix: string;
    footerSuffix: string;
  }
> = {
  en: {
    linkLabels: {
      terms: 'Terms of Use',
      conditions: 'Service Conditions',
      privacy: 'Privacy',
      faq: 'FAQ',
      contact: 'Contact',
      safety: 'Child Safety',
    },
    navLabel: 'Footer links',
    modalSubtitle: 'TaleTime help and policy information',
    quickReference: 'These details are provided for quick in-app reference.',
    footerPrefix: 'A',
    footerSuffix: 'company',
  },
  es: {
    linkLabels: {
      terms: 'Términos de uso',
      conditions: 'Condiciones del servicio',
      privacy: 'Privacidad',
      faq: 'Preguntas frecuentes',
      contact: 'Contacto',
      safety: 'Seguridad infantil',
    },
    navLabel: 'Enlaces del pie de página',
    modalSubtitle: 'Información de ayuda y políticas de TaleTime',
    quickReference: 'Estos detalles se proporcionan como referencia rápida dentro de la aplicación.',
    footerPrefix: 'Una',
    footerSuffix: 'empresa',
  },
  el: {
    linkLabels: {
      terms: 'Όροι χρήσης',
      conditions: 'Όροι υπηρεσίας',
      privacy: 'Απόρρητο',
      faq: 'Συχνές ερωτήσεις',
      contact: 'Επικοινωνία',
      safety: 'Ασφάλεια παιδιών',
    },
    navLabel: 'Σύνδεσμοι υποσέλιδου',
    modalSubtitle: 'Πληροφορίες βοήθειας και πολιτικών του TaleTime',
    quickReference: 'Αυτές οι λεπτομέρειες παρέχονται για γρήγορη αναφορά μέσα στην εφαρμογή.',
    footerPrefix: 'Μια',
    footerSuffix: 'εταιρεία',
  },
  'pt-BR': {
    linkLabels: {
      terms: 'Termos de uso',
      conditions: 'Condições do serviço',
      privacy: 'Privacidade',
      faq: 'FAQ',
      contact: 'Contato',
      safety: 'Segurança infantil',
    },
    navLabel: 'Links do rodapé',
    modalSubtitle: 'Informações de ajuda e políticas do TaleTime',
    quickReference: 'Estes detalhes são fornecidos para referência rápida no aplicativo.',
    footerPrefix: 'Uma',
    footerSuffix: 'empresa',
  },
  de: {
    linkLabels: {
      terms: 'Nutzungsbedingungen',
      conditions: 'Servicebedingungen',
      privacy: 'Datenschutz',
      faq: 'FAQ',
      contact: 'Kontakt',
      safety: 'Kindersicherheit',
    },
    navLabel: 'Footer-Links',
    modalSubtitle: 'Hilfe- und Richtlinieninformationen zu TaleTime',
    quickReference: 'Diese Angaben dienen als schnelle Referenz innerhalb der App.',
    footerPrefix: 'Ein',
    footerSuffix: 'Unternehmen',
  },
};

export function HomeFooterLinks() {
  const { locale } = useI18n();
  const uiText = UI_TEXT[locale] ?? UI_TEXT.en;
  const [activeKey, setActiveKey] = useState<FooterContentKey | null>(null);
  const titleId = useId();
  const descriptionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!activeKey) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveKey(null);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    queueMicrotask(() => closeButtonRef.current?.focus());

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeKey]);

  const englishContent = useMemo<Record<FooterContentKey, FooterContent>>(
    () => ({
      terms: {
        title: 'Terms of Use',
        body: (
          <div className="space-y-3 text-sm text-tt-primary">
            <p>
              These Terms of Use constitute a binding agreement between you and TaleTime governing access to and use
              of the platform, including discovery, reading, audio playback, personalization, and related account
              features. By accessing or using the service, you acknowledge and accept these terms.
            </p>
            <p>
              TaleTime is designed, developed, and owned by CloverTree Technologies, LLC. All rights in the service,
              branding, software, and associated platform materials are reserved unless expressly granted.
            </p>
            <p>
              TaleTime is licensed for personal, non-commercial use only. Except as expressly authorized, you may not
              reproduce, distribute, modify, publish, sublicense, sell, or otherwise exploit any content, data,
              interface elements, summaries, or derivative outputs made available through the service.
            </p>
            <p>
              You are solely responsible for maintaining account security, safeguarding credentials, and all activities
              conducted through your account. Unauthorized access, sharing of credentials, or negligent account handling
              remains your responsibility to the extent permitted by law.
            </p>
            <div>
              <p className="font-semibold">1. Prohibited Conduct</p>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                <li>Unauthorized access, interception, extraction, or misuse of systems, APIs, or data.</li>
                <li>Interference with service integrity, availability, security controls, or normal operation.</li>
                <li>Submission or transmission of unlawful, infringing, harmful, deceptive, or abusive material.</li>
                <li>Automated scraping, reverse engineering, circumvention, or high-volume abuse of endpoints.</li>
              </ul>
            </div>
            <p>
              TaleTime may modify, suspend, or discontinue any feature at any time for security, legal, operational,
              or product reasons without liability for such changes, except where prohibited by applicable law.
            </p>
            <p>
              We reserve the right to investigate violations and to suspend, restrict, or terminate access at our sole
              discretion for breach, abuse, legal risk, or safety concerns. Where required or appropriate, we may
              preserve evidence and cooperate with law-enforcement or regulatory authorities.
            </p>
            <p>
              <span className="font-semibold">2. Effective Date:</span> February 15, 2026. These terms remain in effect
              until superseded by an updated version published in the service.
            </p>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE,” WITHOUT
              WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. TALETIME DISCLAIMS IMPLIED WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND UNINTERRUPTED OR ERROR-FREE OPERATION.
            </p>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, TALETIME SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOSS OF DATA, PROFITS, GOODWILL, OR BUSINESS
              INTERRUPTION, ARISING FROM OR RELATING TO USE OF THE SERVICE.
            </p>
            <p>
              <span className="font-semibold">3. Governing Law and Venue:</span> Except where non-waivable local law
              applies, these terms are governed by applicable laws designated by CloverTree Technologies, LLC, and any
              dispute shall be brought in courts of competent jurisdiction designated in applicable service notices.
            </p>
          </div>
        ),
      },
      conditions: {
        title: 'Service Conditions',
        body: (
          <div className="space-y-3 text-sm text-tt-primary">
            <p>
              These Service Conditions define technical and operational prerequisites for use of TaleTime, including
              device compatibility, browser support, network connectivity, and local storage capacity.
            </p>
            <p>
              TaleTime is operated by CloverTree Technologies, LLC. References to “we,” “our,” or “us” in Service
              Conditions refer to CloverTree Technologies, LLC as the operating entity.
            </p>
            <p>
              Availability of titles, language options, media formats, and estimated read-time values may change
              without notice due to source variability, rights constraints, technical limitations, or data corrections.
            </p>
            <div>
              <p className="font-semibold">1. Operational Conditions</p>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                <li>Offline access is contingent on successful local caching and available device storage.</li>
                <li>Audio and rendering performance vary by hardware, browser engine, and network conditions.</li>
                <li>Search, ranking, and recommendations may change as indexing and quality systems evolve.</li>
                <li>Third-party source endpoints may be unavailable, changed, restricted, or rate-limited.</li>
              </ul>
            </div>
            <p>
              TaleTime may temporarily limit or disable features for maintenance, incident response, abuse mitigation,
              legal compliance, infrastructure migration, or security hardening.
            </p>
            <p>
              Any premium or paid features, if offered, are subject to separate billing disclosures and entitlement
              terms presented at purchase. Trial availability, renewal terms, and eligibility may differ by region.
            </p>
            <p>
              TaleTime reserves the right to set and enforce technical limits, usage thresholds, and anti-abuse
              protections necessary to preserve stability, security, and equitable access.
            </p>
            <p>
              Except where non-waivable rights apply, TaleTime is not responsible for interruption, delay, or failure
              caused by force majeure events, provider outages, internet routing issues, or third-party dependencies.
            </p>
          </div>
        ),
      },
      privacy: {
        title: 'Privacy',
        body: (
          <div className="space-y-3 text-sm text-tt-primary">
            <p>
              This Privacy section explains the categories of information processed by TaleTime, the lawful purposes
              for processing, retention principles, and your available rights subject to applicable law.
            </p>
            <p>
              For purposes of this in-app policy summary, CloverTree Technologies, LLC is the operator of TaleTime and
              the primary point of responsibility for privacy administration, subject to applicable law.
            </p>
            <div>
              <p className="font-semibold">1. Categories of Information</p>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                <li>Account identifiers and authentication details required to provide account-based features.</li>
                <li>User settings, reading history, favorites, bookmarks, and related personalization data.</li>
                <li>Technical diagnostics, device metadata, and security telemetry for reliability and fraud control.</li>
                <li>Communications and support submissions voluntarily provided by you.</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">2. Processing Purposes</p>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                <li>Provision, maintain, and personalize TaleTime services and reading continuity.</li>
                <li>Operate caching, synchronization, and restore state for supported features.</li>
                <li>Detect, prevent, and investigate abuse, unauthorized access, and security incidents.</li>
                <li>Comply with legal obligations, enforce terms, and resolve support requests.</li>
              </ul>
            </div>
            <p>
              Certain data is stored locally on your device, including cached content and reading position, to support
              offline access and performance. Local data removal is available through app controls where implemented.
            </p>
            <p>
              TaleTime does not sell personal information. We may disclose information to processors and service
              providers under contractual safeguards, and when necessary for legal compliance, security response,
              rights protection, or prevention of imminent harm.
            </p>
            <p>
              Data is retained only as long as reasonably necessary for the stated purposes, legal obligations,
              security needs, and dispute resolution. Retention periods may vary by data category and jurisdiction.
            </p>
            <p>
              Subject to regional law, you may have rights to access, correct, delete, restrict, object, or request
              portability of personal data. To submit a request, use in-app contact channels with account details
              sufficient for verification.
            </p>
          </div>
        ),
      },
      faq: {
        title: 'FAQ',
        body: (
          <div className="space-y-3 text-sm text-tt-primary">
            <div>
              <p className="font-semibold">1. Can I read books offline?</p>
              <p>
                Offline reading is available only after successful local caching and is subject to device storage,
                browser behavior, and cache integrity. TaleTime does not guarantee offline availability for all titles
                or all environments.
              </p>
            </div>
            <div>
              <p className="font-semibold">2. Can I switch between full and bedtime versions?</p>
              <p>
                Version selection can be changed through the home-screen toggle. Persisted preferences are generally
                device-local and may reset after data clearing, browser policy changes, or storage eviction.
              </p>
            </div>
            <div>
              <p className="font-semibold">3. How do I report incorrect content?</p>
              <p>
                Submit a report through in-app feedback including title, issue classification, and reproduction details.
                TaleTime reviews reports in good faith but does not guarantee specific remediation timelines.
              </p>
            </div>
            <div>
              <p className="font-semibold">4. Do I need an account to read?</p>
              <p>
                Some functionality may be accessible without authentication; however, account-specific features,
                synchronization, and certain controls require a valid signed-in account.
              </p>
            </div>
            <div>
              <p className="font-semibold">5. How can I clear local data?</p>
              <p>
                Use available storage and cache controls to remove local artifacts. Clearing local data may permanently
                remove offline books, reading progress, and device-specific preferences.
              </p>
            </div>
            <div>
              <p className="font-semibold">6. Does TaleTime provide legal or educational guarantees?</p>
              <p>
                No. Content and tooling are provided for informational and reading support purposes only and are not a
                substitute for legal advice, clinical guidance, or accredited educational evaluation.
              </p>
            </div>
            <div>
              <p className="font-semibold">7. Who owns and operates TaleTime?</p>
              <p>
                TaleTime is designed, developed, owned, and operated by CloverTree Technologies, LLC.
              </p>
            </div>
          </div>
        ),
      },
      contact: {
        title: 'Contact',
        body: (
          <div className="space-y-3 text-sm text-tt-primary">
            <p>
              TaleTime support and policy communications are managed by CloverTree Technologies, LLC.
            </p>
            <p>
              Need help? Reach out through the in-app feedback form for the fastest response.
            </p>
            <p>
              Include your device type, a short description, and steps to reproduce any issue.
            </p>
            <p>
              For account-related requests, sign in before submitting feedback so support can locate your profile.
            </p>
            <p>
              For legal, privacy, or compliance inquiries, identify your request category clearly so CloverTree
              Technologies, LLC can route it to the appropriate team.
            </p>
          </div>
        ),
      },
      safety: {
        title: 'Child Safety',
        body: (
          <div className="space-y-3 text-sm text-tt-primary">
            <p>
              TaleTime applies family-safety controls intended to support age-appropriate usage; however, no automated
              moderation, classification, or filtering system can guarantee complete prevention of unsuitable material.
            </p>
            <p>
              Child-safety processes for TaleTime are administered by CloverTree Technologies, LLC in alignment with
              product policy, platform safeguards, and applicable legal obligations.
            </p>
            <div>
              <p className="font-semibold">1. Safety Commitments</p>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                <li>Use age-suitability signals in ranking, discovery, and presentation workflows.</li>
                <li>Investigate safety reports and apply moderation actions where policy thresholds are met.</li>
                <li>Operate anti-abuse safeguards to reduce misuse, harmful submissions, and account compromise.</li>
                <li>Provide configuration options that enable caregiver-led supervision practices.</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">2. Caregiver Responsibilities</p>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                <li>Review and supervise content selections for minors, particularly younger children.</li>
                <li>Use device-level controls and household rules to manage access duration and behavior.</li>
                <li>Protect credentials and avoid disclosure of child-related identifiers in public channels.</li>
                <li>Promptly report suspicious, harmful, exploitative, or policy-violating material.</li>
              </ul>
            </div>
            <p>
              If there is an immediate threat to safety, contact emergency services or relevant child-protection
              authorities first. In-app reporting is intended for platform moderation follow-up and is not an emergency
              response channel.
            </p>
            <p>
              To the extent permitted by law, TaleTime disclaims liability for third-party content source changes,
              caregiver supervision gaps, or user-side device and network configurations beyond our reasonable control.
            </p>
          </div>
        ),
      },
    }),
    []
  );

  const activeContent = useMemo<Record<FooterContentKey, FooterContent>>(() => {
    if (locale === 'en') return englishContent;

    if (locale === 'es') {
      return {
        terms: {
          title: UI_TEXT.es.linkLabels.terms,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>
                Estos Términos de uso constituyen un acuerdo vinculante entre usted y TaleTime para el acceso y uso de
                la plataforma. Al acceder o utilizar el servicio, usted acepta estos términos.
              </p>
              <p>
                TaleTime es diseñado, desarrollado, poseído y operado por CloverTree Technologies, LLC. Todos los
                derechos sobre el servicio, marca, software y materiales asociados están reservados salvo concesión
                expresa.
              </p>
              <p>
                TaleTime se licencia únicamente para uso personal y no comercial. Salvo autorización expresa, usted no
                puede reproducir, distribuir, modificar, publicar, sublicenciar, vender ni explotar el contenido o los
                resultados derivados del servicio.
              </p>
              <p>
                Usted es responsable de la seguridad de su cuenta, sus credenciales y toda actividad realizada desde su
                cuenta, en la máxima medida permitida por la ley.
              </p>
              <div>
                <p className="font-semibold">1. Conducta prohibida</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Acceso no autorizado, interceptación o extracción indebida de sistemas, API o datos.</li>
                  <li>Interferencia con la disponibilidad, integridad o seguridad operativa del servicio.</li>
                  <li>Envío de material ilícito, infractor, engañoso, abusivo o dañino.</li>
                  <li>Raspado automatizado, ingeniería inversa o evasión de controles técnicos.</li>
                </ul>
              </div>
              <p>
                TaleTime puede modificar, suspender o retirar funciones por motivos de seguridad, operación,
                cumplimiento normativo o producto, sin responsabilidad por dichos cambios salvo prohibición legal.
              </p>
              <p>
                Nos reservamos el derecho de investigar incumplimientos, restringir o cancelar acceso y cooperar con
                autoridades cuando sea necesario por obligaciones legales o riesgos de seguridad.
              </p>
              <p>
                <span className="font-semibold">2. Fecha de vigencia:</span> 15 de febrero de 2026. Estos términos
                permanecerán vigentes hasta su sustitución por una versión actualizada publicada en el servicio.
              </p>
              <p>
                EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, EL SERVICIO SE PROPORCIONA “TAL CUAL” Y “SEGÚN
                DISPONIBILIDAD”, SIN GARANTÍAS EXPRESAS O IMPLÍCITAS, INCLUYENDO COMERCIABILIDAD, APTITUD PARA UN FIN
                PARTICULAR Y NO INFRACCIÓN.
              </p>
              <p>
                EN LA MÁXIMA MEDIDA PERMITIDA POR LA LEY, CLOVERTREE TECHNOLOGIES, LLC NO SERÁ RESPONSABLE POR DAÑOS
                INDIRECTOS, INCIDENTALES, ESPECIALES, CONSECUENCIALES, PUNITIVOS, NI POR PÉRDIDA DE DATOS, BENEFICIOS,
                FONDO DE COMERCIO O INTERRUPCIÓN DEL NEGOCIO.
              </p>
              <p>
                <span className="font-semibold">3. Ley aplicable y jurisdicción:</span> salvo normas imperativas, estos
                términos se rigen por la ley aplicable designada por CloverTree Technologies, LLC y las controversias
                se someterán a tribunales competentes conforme a los avisos de servicio aplicables.
              </p>
            </div>
          ),
        },
        conditions: {
          title: UI_TEXT.es.linkLabels.conditions,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>
                Estas Condiciones del servicio describen los requisitos técnicos y operativos para usar TaleTime,
                incluyendo compatibilidad de dispositivo, navegador, red y almacenamiento local.
              </p>
              <p>
                TaleTime es operado por CloverTree Technologies, LLC. Las referencias a “nosotros” en estas
                condiciones se refieren a CloverTree Technologies, LLC como entidad operadora.
              </p>
              <p>
                La disponibilidad de títulos, idiomas, formatos y estimaciones de lectura puede variar sin previo aviso
                por cambios de fuente, derechos, limitaciones técnicas o correcciones de datos.
              </p>
              <div>
                <p className="font-semibold">1. Condiciones operativas</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>El acceso sin conexión depende de caché local correcta y espacio disponible.</li>
                  <li>El rendimiento de audio y renderizado depende de hardware, navegador y red.</li>
                  <li>La búsqueda y recomendaciones pueden cambiar por evolución de índices y calidad.</li>
                  <li>Las fuentes de terceros pueden no estar disponibles, cambiar o limitarse.</li>
                </ul>
              </div>
              <p>
                TaleTime puede limitar o desactivar funciones temporalmente por mantenimiento, seguridad, mitigación de
                abuso, cumplimiento legal o migraciones de infraestructura.
              </p>
              <p>
                Las funciones de pago, si existen, se rigen por términos de facturación y elegibilidad presentados al
                momento de compra.
              </p>
              <p>
                TaleTime puede aplicar límites técnicos y protecciones antiabuso para preservar estabilidad, seguridad y
                acceso equitativo.
              </p>
              <p>
                Salvo derechos irrenunciables, TaleTime no responde por interrupciones causadas por fuerza mayor,
                caídas de proveedores, problemas de enrutamiento de internet o dependencias de terceros.
              </p>
            </div>
          ),
        },
        privacy: {
          title: UI_TEXT.es.linkLabels.privacy,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>
                Esta sección de Privacidad explica qué categorías de información procesa TaleTime, con qué fines,
                principios de retención y derechos disponibles según la ley aplicable.
              </p>
              <p>
                Para esta política resumida, CloverTree Technologies, LLC es el operador de TaleTime y el principal
                responsable de administración de privacidad, sujeto a la legislación vigente.
              </p>
              <div>
                <p className="font-semibold">1. Categorías de información</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Identificadores de cuenta y autenticación necesarios para funciones con cuenta.</li>
                  <li>Preferencias, historial de lectura, favoritos y marcadores.</li>
                  <li>Diagnósticos técnicos, metadatos de dispositivo y telemetría de seguridad.</li>
                  <li>Comunicaciones y solicitudes de soporte enviadas voluntariamente.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold">2. Fines del tratamiento</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Proveer, mantener y personalizar servicios de TaleTime.</li>
                  <li>Operar caché, sincronización y restauración de estado.</li>
                  <li>Detectar, prevenir e investigar abuso y accesos no autorizados.</li>
                  <li>Cumplir obligaciones legales, hacer cumplir términos y atender soporte.</li>
                </ul>
              </div>
              <p>
                Parte de la información se almacena localmente en su dispositivo para rendimiento y uso sin conexión.
                La eliminación local está disponible mediante controles de la app cuando existan.
              </p>
              <p>
                TaleTime no vende información personal. Puede divulgar datos a proveedores autorizados y por motivos de
                cumplimiento legal, respuesta de seguridad, protección de derechos o prevención de daño inminente.
              </p>
              <p>
                Los datos se conservan solo el tiempo razonablemente necesario para fines operativos, legales,
                seguridad y resolución de controversias. Los periodos varían por tipo de datos y jurisdicción.
              </p>
              <p>
                Según su región, puede tener derechos de acceso, rectificación, eliminación, limitación, oposición o
                portabilidad. Para ejercerlos, use los canales de contacto internos con datos suficientes de
                verificación.
              </p>
            </div>
          ),
        },
        faq: {
          title: UI_TEXT.es.linkLabels.faq,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <div>
                <p className="font-semibold">1. ¿Puedo leer libros sin conexión?</p>
                <p>Solo tras caché local correcta; depende de almacenamiento, navegador e integridad de caché.</p>
              </div>
              <div>
                <p className="font-semibold">2. ¿Puedo cambiar entre versión completa y bedtime?</p>
                <p>La selección puede cambiarse en la pantalla principal y puede reiniciarse tras limpiar datos.</p>
              </div>
              <div>
                <p className="font-semibold">3. ¿Cómo reporto contenido incorrecto?</p>
                <p>Use feedback in-app con título, clasificación del problema y pasos de reproducción.</p>
              </div>
              <div>
                <p className="font-semibold">4. ¿Necesito cuenta para leer?</p>
                <p>Algunas funciones no requieren autenticación; sincronización y funciones de cuenta sí la requieren.</p>
              </div>
              <div>
                <p className="font-semibold">5. ¿Cómo borro datos locales?</p>
                <p>Use controles de almacenamiento/caché; puede eliminar libros offline y progreso local.</p>
              </div>
              <div>
                <p className="font-semibold">6. ¿TaleTime ofrece garantías legales o educativas?</p>
                <p>No. El contenido es informativo y no sustituye asesoría legal, clínica o evaluación acreditada.</p>
              </div>
              <div>
                <p className="font-semibold">7. ¿Quién posee y opera TaleTime?</p>
                <p>TaleTime es diseñado, desarrollado, poseído y operado por CloverTree Technologies, LLC.</p>
              </div>
            </div>
          ),
        },
        contact: {
          title: UI_TEXT.es.linkLabels.contact,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>El soporte y las comunicaciones de políticas de TaleTime son gestionados por CloverTree Technologies, LLC.</p>
              <p>Para ayuda técnica, use el formulario de feedback dentro de la aplicación.</p>
              <p>Incluya tipo de dispositivo, descripción breve y pasos para reproducir el problema.</p>
              <p>Para solicitudes de cuenta, inicie sesión antes de enviar su consulta.</p>
              <p>Para asuntos legales, privacidad o cumplimiento, identifique claramente la categoría de solicitud.</p>
            </div>
          ),
        },
        safety: {
          title: UI_TEXT.es.linkLabels.safety,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>
                TaleTime aplica controles orientados a uso apropiado por edad; sin embargo, ningún sistema automatizado
                garantiza prevención total de material inadecuado.
              </p>
              <p>
                Los procesos de seguridad infantil de TaleTime son administrados por CloverTree Technologies, LLC de
                acuerdo con políticas del producto y obligaciones legales aplicables.
              </p>
              <div>
                <p className="font-semibold">1. Compromisos de seguridad</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Uso de señales de adecuación por edad en descubrimiento y presentación.</li>
                  <li>Revisión de reportes y aplicación de medidas de moderación según umbrales.</li>
                  <li>Salvaguardas antiabuso para reducir uso malicioso y compromiso de cuentas.</li>
                  <li>Opciones de configuración para supervisión por cuidadores.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold">2. Responsabilidades del cuidador</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Supervisar selecciones de contenido para menores, especialmente niños pequeños.</li>
                  <li>Usar controles del dispositivo y reglas del hogar.</li>
                  <li>Proteger credenciales y evitar exposición pública de datos de menores.</li>
                  <li>Reportar material sospechoso, dañino o infractor de políticas.</li>
                </ul>
              </div>
              <p>
                Ante riesgo inmediato, contacte primero servicios de emergencia o autoridades de protección infantil.
                El reporte in-app no es un canal de respuesta urgente.
              </p>
              <p>
                En la máxima medida permitida por la ley, TaleTime no asume responsabilidad por cambios en fuentes de
                terceros, falta de supervisión o configuraciones de red/dispositivo fuera de control razonable.
              </p>
            </div>
          ),
        },
      };
    }

    if (locale === 'pt-BR') {
      return {
        terms: {
          title: UI_TEXT['pt-BR'].linkLabels.terms,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>
                Estes Termos de uso constituem acordo vinculante entre você e TaleTime para acesso e uso da
                plataforma. Ao acessar ou utilizar o serviço, você concorda com estes termos.
              </p>
              <p>
                TaleTime é projetado, desenvolvido, de propriedade e operado por CloverTree Technologies, LLC. Todos
                os direitos sobre serviço, marca, software e materiais associados são reservados, salvo concessão
                expressa.
              </p>
              <p>
                TaleTime é licenciado apenas para uso pessoal e não comercial. Sem autorização expressa, você não pode
                reproduzir, distribuir, modificar, publicar, sublicenciar, vender ou explorar conteúdo e derivados.
              </p>
              <p>
                Você é responsável pela segurança da conta, credenciais e atividades realizadas por sua conta, na
                máxima extensão permitida por lei.
              </p>
              <div>
                <p className="font-semibold">1. Condutas proibidas</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Acesso não autorizado, interceptação ou extração indevida de sistemas, APIs ou dados.</li>
                  <li>Interferência na disponibilidade, integridade ou segurança operacional do serviço.</li>
                  <li>Envio de material ilícito, infrator, enganoso, abusivo ou nocivo.</li>
                  <li>Raspagem automatizada, engenharia reversa ou evasão de controles técnicos.</li>
                </ul>
              </div>
              <p>
                TaleTime pode modificar, suspender ou descontinuar funcionalidades por motivos operacionais, de
                segurança, conformidade legal ou produto, sem responsabilidade por tais alterações, salvo vedação legal.
              </p>
              <p>
                Reservamo-nos o direito de investigar violações, restringir ou encerrar acesso e cooperar com
                autoridades quando necessário por obrigação legal ou risco de segurança.
              </p>
              <p>
                <span className="font-semibold">2. Data de vigência:</span> 15 de fevereiro de 2026. Estes termos
                permanecem válidos até serem substituídos por versão atualizada publicada no serviço.
              </p>
              <p>
                NA MÁXIMA EXTENSÃO PERMITIDA POR LEI, O SERVIÇO É FORNECIDO “NO ESTADO EM QUE SE ENCONTRA” E “CONFORME
                DISPONÍVEL”, SEM GARANTIAS EXPRESSAS OU IMPLÍCITAS, INCLUINDO COMERCIALIZAÇÃO, ADEQUAÇÃO A FINALIDADE
                ESPECÍFICA E NÃO VIOLAÇÃO.
              </p>
              <p>
                NA MÁXIMA EXTENSÃO PERMITIDA POR LEI, A CLOVERTREE TECHNOLOGIES, LLC NÃO RESPONDE POR DANOS INDIRETOS,
                INCIDENTAIS, ESPECIAIS, CONSEQUENCIAIS OU PUNITIVOS, NEM POR PERDA DE DADOS, LUCROS, FUNDO DE
                COMÉRCIO OU INTERRUPÇÃO DE NEGÓCIOS.
              </p>
              <p>
                <span className="font-semibold">3. Lei aplicável e foro:</span> salvo direitos irrenunciáveis, estes
                termos são regidos pelas leis aplicáveis designadas pela CloverTree Technologies, LLC, e disputas serão
                submetidas aos tribunais competentes conforme avisos de serviço aplicáveis.
              </p>
            </div>
          ),
        },
        conditions: {
          title: UI_TEXT['pt-BR'].linkLabels.conditions,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>
                Estas Condições de serviço definem pré-requisitos técnicos e operacionais para uso do TaleTime,
                incluindo compatibilidade de dispositivo, navegador, conectividade e armazenamento local.
              </p>
              <p>
                TaleTime é operado pela CloverTree Technologies, LLC. Referências a “nós” nestas condições referem-se
                à CloverTree Technologies, LLC como entidade operadora.
              </p>
              <p>
                A disponibilidade de títulos, idiomas, formatos e estimativas de leitura pode variar sem aviso por
                mudanças de fonte, restrições de direitos, limitações técnicas ou correções de dados.
              </p>
              <div>
                <p className="font-semibold">1. Condições operacionais</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Acesso offline depende de cache local bem-sucedido e espaço disponível no dispositivo.</li>
                  <li>Desempenho de áudio e renderização varia por hardware, navegador e rede.</li>
                  <li>Busca e recomendações podem mudar conforme evolução de indexação e qualidade.</li>
                  <li>Fontes de terceiros podem ficar indisponíveis, alteradas ou limitadas.</li>
                </ul>
              </div>
              <p>
                TaleTime pode limitar ou desativar recursos temporariamente por manutenção, resposta a incidentes,
                mitigação de abuso, conformidade legal ou migração de infraestrutura.
              </p>
              <p>
                Recursos pagos, se oferecidos, seguem termos de cobrança e elegibilidade apresentados no momento da
                contratação.
              </p>
              <p>
                TaleTime pode aplicar limites técnicos e proteções antiabuso para preservar estabilidade, segurança e
                acesso equitativo.
              </p>
              <p>
                Salvo direitos irrenunciáveis, TaleTime não é responsável por interrupções causadas por força maior,
                falhas de provedores, roteamento de internet ou dependências de terceiros.
              </p>
            </div>
          ),
        },
        privacy: {
          title: UI_TEXT['pt-BR'].linkLabels.privacy,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>
                Esta seção de Privacidade explica categorias de dados processados pelo TaleTime, finalidades do
                tratamento, princípios de retenção e direitos disponíveis conforme legislação aplicável.
              </p>
              <p>
                Para este resumo no aplicativo, CloverTree Technologies, LLC é a operadora do TaleTime e responsável
                principal pela administração de privacidade, sujeito à lei aplicável.
              </p>
              <div>
                <p className="font-semibold">1. Categorias de informação</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Identificadores de conta e autenticação necessários para recursos com conta.</li>
                  <li>Preferências, histórico de leitura, favoritos e marcadores.</li>
                  <li>Diagnósticos técnicos, metadados de dispositivo e telemetria de segurança.</li>
                  <li>Comunicações e solicitações de suporte enviadas voluntariamente.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold">2. Finalidades do tratamento</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Prover, manter e personalizar os serviços TaleTime.</li>
                  <li>Operar cache, sincronização e restauração de estado.</li>
                  <li>Detectar, prevenir e investigar abuso e acesso não autorizado.</li>
                  <li>Cumprir obrigações legais, aplicar termos e atender suporte.</li>
                </ul>
              </div>
              <p>
                Parte dos dados é armazenada localmente para desempenho e uso offline. A remoção local pode ser feita
                por controles do app quando disponíveis.
              </p>
              <p>
                TaleTime não vende dados pessoais. Pode haver divulgação a processadores autorizados e por motivos de
                conformidade legal, resposta de segurança, proteção de direitos ou prevenção de dano iminente.
              </p>
              <p>
                Os dados são retidos apenas pelo período razoavelmente necessário para finalidades operacionais,
                legais, segurança e resolução de disputas. Os prazos variam por categoria e jurisdição.
              </p>
              <p>
                Conforme sua região, você pode ter direitos de acesso, correção, exclusão, restrição, oposição ou
                portabilidade. Para exercer direitos, use os canais internos de contato com dados de verificação.
              </p>
            </div>
          ),
        },
        faq: {
          title: UI_TEXT['pt-BR'].linkLabels.faq,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <div>
                <p className="font-semibold">1. Posso ler livros offline?</p>
                <p>Somente após cache local bem-sucedido; depende de armazenamento, navegador e integridade do cache.</p>
              </div>
              <div>
                <p className="font-semibold">2. Posso alternar entre versão completa e bedtime?</p>
                <p>A seleção pode ser alterada na tela inicial e pode ser redefinida após limpeza de dados locais.</p>
              </div>
              <div>
                <p className="font-semibold">3. Como reporto conteúdo incorreto?</p>
                <p>Use feedback no app com título, classificação do problema e etapas de reprodução.</p>
              </div>
              <div>
                <p className="font-semibold">4. Preciso de conta para ler?</p>
                <p>Algumas funções funcionam sem login; sincronização e recursos de conta exigem autenticação.</p>
              </div>
              <div>
                <p className="font-semibold">5. Como posso limpar dados locais?</p>
                <p>Use controles de armazenamento e cache; isso pode remover livros offline e progresso local.</p>
              </div>
              <div>
                <p className="font-semibold">6. TaleTime oferece garantias legais ou educacionais?</p>
                <p>Não. O conteúdo é informativo e não substitui orientação jurídica, clínica ou avaliação acreditada.</p>
              </div>
              <div>
                <p className="font-semibold">7. Quem possui e opera o TaleTime?</p>
                <p>TaleTime é projetado, desenvolvido, de propriedade e operado pela CloverTree Technologies, LLC.</p>
              </div>
            </div>
          ),
        },
        contact: {
          title: UI_TEXT['pt-BR'].linkLabels.contact,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>Suporte e comunicações de políticas do TaleTime são gerenciados pela CloverTree Technologies, LLC.</p>
              <p>Para ajuda técnica, use o formulário de feedback dentro do aplicativo.</p>
              <p>Inclua tipo de dispositivo, descrição curta e passos para reprodução do problema.</p>
              <p>Para solicitações de conta, faça login antes de enviar sua solicitação.</p>
              <p>Para temas legais, privacidade ou compliance, informe claramente a categoria do pedido.</p>
            </div>
          ),
        },
        safety: {
          title: UI_TEXT['pt-BR'].linkLabels.safety,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>
                TaleTime aplica controles voltados a uso apropriado por faixa etária; contudo, nenhum sistema
                automatizado garante prevenção total de material inadequado.
              </p>
              <p>
                Os processos de segurança infantil do TaleTime são administrados pela CloverTree Technologies, LLC em
                conformidade com políticas do produto e obrigações legais aplicáveis.
              </p>
              <div>
                <p className="font-semibold">1. Compromissos de segurança</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Uso de sinais de adequação etária em descoberta e apresentação de conteúdo.</li>
                  <li>Investigação de denúncias e aplicação de moderação conforme critérios de política.</li>
                  <li>Salvaguardas antiabuso para reduzir uso malicioso e comprometimento de conta.</li>
                  <li>Opções de configuração para supervisão por responsáveis.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold">2. Responsabilidades de responsáveis</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Supervisionar seleções de conteúdo para menores, especialmente crianças pequenas.</li>
                  <li>Usar controles de dispositivo e regras da família.</li>
                  <li>Proteger credenciais e evitar exposição pública de dados de menores.</li>
                  <li>Reportar material suspeito, nocivo ou que viole políticas.</li>
                </ul>
              </div>
              <p>
                Em caso de risco imediato, contate primeiro serviços de emergência ou autoridades de proteção infantil.
                O reporte in-app não substitui canais oficiais de urgência.
              </p>
              <p>
                Na máxima extensão permitida por lei, TaleTime não responde por mudanças de fontes de terceiros,
                falhas de supervisão ou configurações de rede/dispositivo fora de controle razoável.
              </p>
            </div>
          ),
        },
      };
    }

    if (locale === 'de') {
      return {
        terms: {
          title: UI_TEXT.de.linkLabels.terms,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>
                Diese Nutzungsbedingungen sind eine verbindliche Vereinbarung zwischen Ihnen und TaleTime über Zugang
                und Nutzung der Plattform. Mit der Nutzung des Dienstes akzeptieren Sie diese Bedingungen.
              </p>
              <p>
                TaleTime wird von CloverTree Technologies, LLC entworfen, entwickelt, besessen und betrieben. Alle
                Rechte an Dienst, Marke, Software und zugehörigen Materialien bleiben vorbehalten, sofern nicht
                ausdrücklich eingeräumt.
              </p>
              <p>
                TaleTime ist ausschließlich für private, nicht-kommerzielle Nutzung lizenziert. Ohne ausdrückliche
                Erlaubnis dürfen Inhalte oder abgeleitete Ergebnisse nicht vervielfältigt, verbreitet, veröffentlicht,
                unterlizenziert, verkauft oder sonst verwertet werden.
              </p>
              <p>
                Sie sind für Kontosicherheit, Zugangsdaten und sämtliche über Ihr Konto ausgeführte Aktivitäten
                verantwortlich, soweit gesetzlich zulässig.
              </p>
              <div>
                <p className="font-semibold">1. Verbotenes Verhalten</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Unbefugter Zugriff, Abfangen oder missbräuchliche Extraktion von Systemen, APIs oder Daten.</li>
                  <li>Störung von Verfügbarkeit, Integrität oder Sicherheit des Dienstbetriebs.</li>
                  <li>Übermittlung rechtswidriger, verletzender, täuschender, missbräuchlicher oder schädlicher Inhalte.</li>
                  <li>Automatisiertes Scraping, Reverse Engineering oder Umgehung technischer Schutzmaßnahmen.</li>
                </ul>
              </div>
              <p>
                TaleTime kann Funktionen aus Betriebs-, Sicherheits-, Compliance- oder Produktgründen ändern,
                aussetzen oder einstellen, ohne Haftung für solche Änderungen, soweit rechtlich zulässig.
              </p>
              <p>
                Wir behalten uns das Recht vor, Verstöße zu untersuchen, Zugänge einzuschränken oder zu beenden und
                bei rechtlicher Notwendigkeit mit Behörden zusammenzuarbeiten.
              </p>
              <p>
                <span className="font-semibold">2. Inkrafttreten:</span> 15. Februar 2026. Diese Bedingungen gelten bis
                zur Ersetzung durch eine aktualisierte im Dienst veröffentlichte Version.
              </p>
              <p>
                SOWEIT GESETZLICH ZULÄSSIG, WIRD DER DIENST „WIE BESEHEN“ UND „WIE VERFÜGBAR“ BEREITGESTELLT, OHNE
                AUSDRÜCKLICHE ODER KONKLUDENTE GEWÄHRLEISTUNGEN, EINSCHLIESSLICH MARKTGÄNGIGKEIT, EIGNUNG FÜR EINEN
                BESTIMMTEN ZWECK UND NICHTVERLETZUNG.
              </p>
              <p>
                SOWEIT GESETZLICH ZULÄSSIG, HAFTET CLOVERTREE TECHNOLOGIES, LLC NICHT FÜR MITTELBARE, ZUFÄLLIGE,
                BESONDERE, FOLGE-, STRAF- ODER EXEMPLARISCHE SCHÄDEN ODER FÜR DATEN-, GEWINN-, GOODWILL- ODER
                GESCHÄFTSUNTERBRECHUNGSVERLUSTE.
              </p>
              <p>
                <span className="font-semibold">3. Anwendbares Recht und Gerichtsstand:</span> vorbehaltlich zwingenden
                Rechts gilt das von CloverTree Technologies, LLC bestimmte anwendbare Recht; Streitigkeiten sind vor
                zuständigen Gerichten gemäß den jeweiligen Servicehinweisen auszutragen.
              </p>
            </div>
          ),
        },
        conditions: {
          title: UI_TEXT.de.linkLabels.conditions,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>
                Diese Servicebedingungen legen technische und betriebliche Voraussetzungen für die Nutzung von TaleTime
                fest, einschließlich Gerätekompatibilität, Browserunterstützung, Netzverbindung und lokalem Speicher.
              </p>
              <p>
                TaleTime wird von CloverTree Technologies, LLC betrieben. Verweise auf „wir“ beziehen sich auf
                CloverTree Technologies, LLC als Betreiber.
              </p>
              <p>
                Verfügbarkeit von Titeln, Sprachen, Formaten und Lesezeitschätzungen kann sich ohne Vorankündigung
                aufgrund von Quellenänderungen, Rechtebeschränkungen, technischen Grenzen oder Datenkorrekturen ändern.
              </p>
              <div>
                <p className="font-semibold">1. Betriebsbedingungen</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Offline-Zugriff setzt erfolgreiches lokales Caching und verfügbaren Gerätespeicher voraus.</li>
                  <li>Audio- und Darstellungsleistung hängt von Hardware, Browser und Netzbedingungen ab.</li>
                  <li>Suche und Empfehlungen können sich durch Index- und Qualitätsanpassungen ändern.</li>
                  <li>Drittquellen können nicht verfügbar, geändert, eingeschränkt oder limitiert sein.</li>
                </ul>
              </div>
              <p>
                TaleTime kann Funktionen vorübergehend einschränken oder deaktivieren, etwa für Wartung,
                Sicherheitsvorfälle, Missbrauchsabwehr, Rechtskonformität oder Infrastrukturmigration.
              </p>
              <p>
                Kostenpflichtige Funktionen unterliegen gesonderten Abrechnungs- und Berechtigungsbedingungen zum
                Erwerbszeitpunkt.
              </p>
              <p>
                TaleTime kann technische Limits und Anti-Missbrauchsmaßnahmen durchsetzen, um Stabilität, Sicherheit
                und fairen Zugang zu erhalten.
              </p>
              <p>
                Soweit keine zwingenden Rechte entgegenstehen, haftet TaleTime nicht für Unterbrechungen durch höhere
                Gewalt, Providerausfälle, Internet-Routing-Probleme oder Drittabhängigkeiten.
              </p>
            </div>
          ),
        },
        privacy: {
          title: UI_TEXT.de.linkLabels.privacy,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>
                Dieser Datenschutzabschnitt erläutert Datenkategorien, Verarbeitungszwecke, Aufbewahrungsgrundsätze
                und Ihre Rechte nach anwendbarem Recht.
              </p>
              <p>
                Für diese In-App-Zusammenfassung ist CloverTree Technologies, LLC Betreiber von TaleTime und primär
                verantwortlich für die Datenschutzverwaltung, vorbehaltlich geltenden Rechts.
              </p>
              <div>
                <p className="font-semibold">1. Datenkategorien</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Konto- und Authentifizierungsdaten für kontobasierte Funktionen.</li>
                  <li>Einstellungen, Leseverlauf, Favoriten und Lesezeichen.</li>
                  <li>Technische Diagnosen, Gerätemetadaten und Sicherheits-Telemetrie.</li>
                  <li>Freiwillig übermittelte Kommunikations- und Supportanfragen.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold">2. Verarbeitungszwecke</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Bereitstellung, Betrieb und Personalisierung von TaleTime.</li>
                  <li>Betrieb von Cache, Synchronisierung und Zustandswiederherstellung.</li>
                  <li>Erkennung, Verhinderung und Untersuchung von Missbrauch und unbefugtem Zugriff.</li>
                  <li>Erfüllung rechtlicher Pflichten, Durchsetzung der Bedingungen und Supportabwicklung.</li>
                </ul>
              </div>
              <p>
                Bestimmte Daten werden lokal gespeichert, um Leistung und Offline-Nutzung zu ermöglichen. Lokales
                Löschen ist über App-Steuerungen möglich, sofern vorhanden.
              </p>
              <p>
                TaleTime verkauft keine personenbezogenen Daten. Offenlegung kann gegenüber autorisierten
                Auftragsverarbeitern sowie aus Gründen der Rechtskonformität, Sicherheit, Rechtewahrung oder
                Schadensprävention erfolgen.
              </p>
              <p>
                Daten werden nur so lange aufbewahrt, wie es für betriebliche, rechtliche, sicherheitsbezogene und
                streitbeilegungsbezogene Zwecke erforderlich ist. Fristen variieren je nach Kategorie und Rechtsraum.
              </p>
              <p>
                Je nach Region können Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung, Widerspruch oder
                Portabilität bestehen. Nutzen Sie In-App-Kontaktkanäle mit ausreichenden Verifikationsdaten.
              </p>
            </div>
          ),
        },
        faq: {
          title: UI_TEXT.de.linkLabels.faq,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <div>
                <p className="font-semibold">1. Kann ich Bücher offline lesen?</p>
                <p>Nur nach erfolgreichem lokalem Caching; abhängig von Speicher, Browser und Cache-Integrität.</p>
              </div>
              <div>
                <p className="font-semibold">2. Kann ich zwischen Vollversion und Bedtime wechseln?</p>
                <p>Die Auswahl ist auf der Startseite möglich und kann nach Datenlöschung zurückgesetzt werden.</p>
              </div>
              <div>
                <p className="font-semibold">3. Wie melde ich fehlerhafte Inhalte?</p>
                <p>Nutzen Sie In-App-Feedback mit Titel, Problemklassifikation und Reproduktionsschritten.</p>
              </div>
              <div>
                <p className="font-semibold">4. Benötige ich ein Konto zum Lesen?</p>
                <p>Einige Funktionen sind ohne Anmeldung nutzbar; Synchronisierung und Kontofunktionen nicht.</p>
              </div>
              <div>
                <p className="font-semibold">5. Wie lösche ich lokale Daten?</p>
                <p>Verwenden Sie Speicher-/Cache-Steuerungen; dadurch können Offline-Bücher und Fortschritt entfallen.</p>
              </div>
              <div>
                <p className="font-semibold">6. Bietet TaleTime rechtliche oder pädagogische Garantien?</p>
                <p>Nein. Inhalte sind informativ und ersetzen keine Rechts-, klinische oder akkreditierte Beratung.</p>
              </div>
              <div>
                <p className="font-semibold">7. Wer besitzt und betreibt TaleTime?</p>
                <p>TaleTime wird von CloverTree Technologies, LLC entworfen, entwickelt, besessen und betrieben.</p>
              </div>
            </div>
          ),
        },
        contact: {
          title: UI_TEXT.de.linkLabels.contact,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>Support- und Richtlinienkommunikation für TaleTime wird von CloverTree Technologies, LLC verwaltet.</p>
              <p>Für technische Hilfe verwenden Sie das In-App-Feedbackformular.</p>
              <p>Geben Sie Gerätetyp, kurze Problembeschreibung und Reproduktionsschritte an.</p>
              <p>Für kontobezogene Anliegen melden Sie sich vor der Anfrage an.</p>
              <p>Für Rechts-, Datenschutz- oder Compliance-Themen benennen Sie die Anfragekategorie eindeutig.</p>
            </div>
          ),
        },
        safety: {
          title: UI_TEXT.de.linkLabels.safety,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>
                TaleTime setzt Schutzmechanismen für altersgerechte Nutzung ein; jedoch kann kein automatisiertes
                System die vollständige Vermeidung ungeeigneter Inhalte garantieren.
              </p>
              <p>
                Kinderschutzprozesse für TaleTime werden von CloverTree Technologies, LLC gemäß Produktpolitik,
                Plattformschutz und geltenden rechtlichen Pflichten durchgeführt.
              </p>
              <div>
                <p className="font-semibold">1. Sicherheitszusagen</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Einsatz von Altersignalen in Ranking, Discovery und Darstellung.</li>
                  <li>Prüfung von Meldungen und Moderationsmaßnahmen nach Richtlinienkriterien.</li>
                  <li>Anti-Missbrauchsmaßnahmen zur Verringerung schädlicher Nutzung und Kontokompromittierung.</li>
                  <li>Konfigurationsoptionen für elterliche Aufsicht.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold">2. Verantwortung von Erziehungsberechtigten</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Inhaltsauswahl für Minderjährige beaufsichtigen, besonders bei jüngeren Kindern.</li>
                  <li>Gerätekontrollen und Haushaltsregeln verwenden.</li>
                  <li>Zugangsdaten schützen und keine kindbezogenen Daten öffentlich teilen.</li>
                  <li>Verdächtige, schädliche oder richtlinienwidrige Inhalte unverzüglich melden.</li>
                </ul>
              </div>
              <p>
                Bei unmittelbarer Gefahr kontaktieren Sie zuerst Notdienste oder Kinderschutzbehörden. In-App-Meldung
                ersetzt keinen behördlichen Sofortkanal.
              </p>
              <p>
                Soweit gesetzlich zulässig, haftet TaleTime nicht für Änderungen von Drittquellen,
                Aufsichtslücken oder nutzerseitige Netz-/Gerätekonfigurationen außerhalb angemessener Kontrolle.
              </p>
            </div>
          ),
        },
      };
    }

    if (locale === 'el') {
      return {
        terms: {
          title: UI_TEXT.el.linkLabels.terms,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>
                Οι παρόντες όροι αποτελούν δεσμευτική συμφωνία μεταξύ εσάς και του TaleTime για πρόσβαση και χρήση της
                πλατφόρμας. Με την πρόσβαση ή χρήση, αποδέχεστε τους όρους.
              </p>
              <p>
                Το TaleTime σχεδιάζεται, αναπτύσσεται, ανήκει και λειτουργεί από την CloverTree Technologies, LLC.
                Όλα τα δικαιώματα στο προϊόν, τη μάρκα, το λογισμικό και το συναφές υλικό διατηρούνται, εκτός αν
                παραχωρηθούν ρητά.
              </p>
              <p>
                Το TaleTime αδειοδοτείται μόνο για προσωπική, μη εμπορική χρήση. Χωρίς ρητή άδεια, απαγορεύεται
                αναπαραγωγή, διανομή, τροποποίηση, δημοσίευση, υπεραδειοδότηση, πώληση ή άλλη εκμετάλλευση.
              </p>
              <p>
                Είστε υπεύθυνοι για την ασφάλεια λογαριασμού, διαπιστευτήρια και δραστηριότητα μέσω του λογαριασμού
                σας, στον μέγιστο βαθμό που επιτρέπει ο νόμος.
              </p>
              <div>
                <p className="font-semibold">1. Απαγορευμένη συμπεριφορά</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Μη εξουσιοδοτημένη πρόσβαση, παρεμβολή ή εξαγωγή δεδομένων από συστήματα ή API.</li>
                  <li>Παρεμπόδιση διαθεσιμότητας, ακεραιότητας ή ασφάλειας λειτουργίας της υπηρεσίας.</li>
                  <li>Υποβολή παράνομου, παραπλανητικού, καταχρηστικού ή επιβλαβούς περιεχομένου.</li>
                  <li>Αυτοματοποιημένο scraping, αντίστροφη μηχανική ή παράκαμψη τεχνικών ελέγχων.</li>
                </ul>
              </div>
              <p>
                Το TaleTime μπορεί να τροποποιεί, αναστέλλει ή διακόπτει λειτουργίες για λόγους λειτουργίας,
                ασφάλειας, συμμόρφωσης ή προϊόντος, χωρίς ευθύνη για τέτοιες αλλαγές όπου επιτρέπεται.
              </p>
              <p>
                Διατηρούμε το δικαίωμα διερεύνησης παραβάσεων, περιορισμού ή τερματισμού πρόσβασης και συνεργασίας με
                αρχές όταν απαιτείται από τον νόμο ή για λόγους ασφάλειας.
              </p>
              <p>
                <span className="font-semibold">2. Ημερομηνία ισχύος:</span> 15 Φεβρουαρίου 2026. Οι όροι ισχύουν έως
                αντικατάστασή τους από ενημερωμένη έκδοση δημοσιευμένη στην υπηρεσία.
              </p>
              <p>
                ΣΤΟΝ ΜΕΓΙΣΤΟ ΒΑΘΜΟ ΠΟΥ ΕΠΙΤΡΕΠΕΤΑΙ ΑΠΟ ΤΟΝ ΝΟΜΟ, Η ΥΠΗΡΕΣΙΑ ΠΑΡΕΧΕΤΑΙ «ΩΣ ΕΧΕΙ» ΚΑΙ «ΩΣ ΔΙΑΘΕΣΙΜΗ»,
                ΧΩΡΙΣ ΡΗΤΕΣ Ή ΣΙΩΠΗΡΕΣ ΕΓΓΥΗΣΕΙΣ, ΠΕΡΙΛΑΜΒΑΝΟΜΕΝΩΝ ΕΜΠΟΡΕΥΣΙΜΟΤΗΤΑΣ, ΚΑΤΑΛΛΗΛΟΤΗΤΑΣ ΓΙΑ ΣΥΓΚΕΚΡΙΜΕΝΟ
                ΣΚΟΠΟ ΚΑΙ ΜΗ ΠΑΡΑΒΙΑΣΗΣ.
              </p>
              <p>
                ΣΤΟΝ ΜΕΓΙΣΤΟ ΒΑΘΜΟ ΠΟΥ ΕΠΙΤΡΕΠΕΤΑΙ ΑΠΟ ΤΟΝ ΝΟΜΟ, Η CLOVERTREE TECHNOLOGIES, LLC ΔΕΝ ΕΥΘΥΝΕΤΑΙ ΓΙΑ
                ΕΜΜΕΣΕΣ, ΠΑΡΕΠΟΜΕΝΕΣ, ΕΙΔΙΚΕΣ, ΠΟΙΝΙΚΕΣ Ή ΑΠΟΘΕΤΙΚΕΣ ΖΗΜΙΕΣ, ΟΥΤΕ ΓΙΑ ΑΠΩΛΕΙΑ ΔΕΔΟΜΕΝΩΝ, ΚΕΡΔΩΝ,
                ΦΗΜΗΣ Ή ΔΙΑΚΟΠΗ ΕΠΙΧΕΙΡΗΜΑΤΙΚΗΣ ΔΡΑΣΤΗΡΙΟΤΗΤΑΣ.
              </p>
              <p>
                <span className="font-semibold">3. Εφαρμοστέο δίκαιο και δικαιοδοσία:</span> με την επιφύλαξη
                αναγκαστικών διατάξεων, οι όροι διέπονται από το εφαρμοστέο δίκαιο που ορίζει η CloverTree
                Technologies, LLC και οι διαφορές υπάγονται σε αρμόδια δικαστήρια σύμφωνα με τις σχετικές ανακοινώσεις.
              </p>
            </div>
          ),
        },
        conditions: {
          title: UI_TEXT.el.linkLabels.conditions,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>
                Οι Όροι υπηρεσίας ορίζουν τεχνικές και λειτουργικές προϋποθέσεις χρήσης του TaleTime, όπως
                συμβατότητα συσκευής, υποστήριξη προγράμματος περιήγησης, συνδεσιμότητα και τοπική αποθήκευση.
              </p>
              <p>
                Το TaleTime λειτουργεί από την CloverTree Technologies, LLC. Οι αναφορές σε «εμείς» αφορούν την
                CloverTree Technologies, LLC ως φορέα λειτουργίας.
              </p>
              <p>
                Η διαθεσιμότητα τίτλων, γλωσσών, μορφών και εκτιμήσεων χρόνου ανάγνωσης μπορεί να αλλάζει χωρίς
                προειδοποίηση λόγω μεταβολών πηγών, δικαιωμάτων, τεχνικών περιορισμών ή διορθώσεων δεδομένων.
              </p>
              <div>
                <p className="font-semibold">1. Λειτουργικές προϋποθέσεις</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Η offline πρόσβαση εξαρτάται από επιτυχή τοπική αποθήκευση και διαθέσιμο χώρο.</li>
                  <li>Η απόδοση ήχου/απεικόνισης εξαρτάται από συσκευή, πρόγραμμα και δίκτυο.</li>
                  <li>Αναζήτηση και προτάσεις ενδέχεται να αλλάξουν με εξέλιξη δεικτοδότησης και ποιότητας.</li>
                  <li>Πηγές τρίτων ενδέχεται να μην είναι διαθέσιμες, να αλλάξουν ή να περιοριστούν.</li>
                </ul>
              </div>
              <p>
                Το TaleTime μπορεί προσωρινά να περιορίζει ή να απενεργοποιεί λειτουργίες για συντήρηση,
                αντιμετώπιση περιστατικών, περιορισμό κατάχρησης, νομική συμμόρφωση ή μετεγκατάσταση υποδομής.
              </p>
              <p>
                Τυχόν επί πληρωμή δυνατότητες διέπονται από ξεχωριστούς όρους χρέωσης και επιλεξιμότητας κατά την
                αγορά.
              </p>
              <p>
                Το TaleTime μπορεί να εφαρμόζει τεχνικά όρια και προστασίες κατά κατάχρησης για διατήρηση
                σταθερότητας, ασφάλειας και δίκαιης πρόσβασης.
              </p>
              <p>
                Εκτός αναγκαστικών δικαιωμάτων, το TaleTime δεν ευθύνεται για διακοπές λόγω ανωτέρας βίας,
                αστοχιών παρόχων, προβλημάτων δρομολόγησης internet ή εξαρτήσεων τρίτων.
              </p>
            </div>
          ),
        },
        privacy: {
          title: UI_TEXT.el.linkLabels.privacy,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>
                Η ενότητα Απορρήτου εξηγεί τις κατηγορίες πληροφοριών που επεξεργάζεται το TaleTime, τους σκοπούς
                επεξεργασίας, αρχές διατήρησης και διαθέσιμα δικαιώματα σύμφωνα με την εφαρμοστέα νομοθεσία.
              </p>
              <p>
                Για αυτή τη σύνοψη εντός εφαρμογής, η CloverTree Technologies, LLC είναι ο φορέας λειτουργίας του
                TaleTime και ο κύριος υπεύθυνος διαχείρισης απορρήτου, με την επιφύλαξη του ισχύοντος δικαίου.
              </p>
              <div>
                <p className="font-semibold">1. Κατηγορίες πληροφοριών</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Αναγνωριστικά λογαριασμού και στοιχεία αυθεντικοποίησης για λειτουργίες λογαριασμού.</li>
                  <li>Ρυθμίσεις, ιστορικό ανάγνωσης, αγαπημένα και σελιδοδείκτες.</li>
                  <li>Τεχνικά διαγνωστικά, μεταδεδομένα συσκευής και τηλεμετρία ασφάλειας.</li>
                  <li>Επικοινωνίες και αιτήματα υποστήριξης που υποβάλλονται εθελοντικά.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold">2. Σκοποί επεξεργασίας</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Παροχή, συντήρηση και εξατομίκευση υπηρεσιών TaleTime.</li>
                  <li>Λειτουργία cache, συγχρονισμού και επαναφοράς κατάστασης.</li>
                  <li>Εντοπισμός, πρόληψη και διερεύνηση κατάχρησης και μη εξουσιοδοτημένης πρόσβασης.</li>
                  <li>Συμμόρφωση με νομικές υποχρεώσεις και εξυπηρέτηση υποστήριξης.</li>
                </ul>
              </div>
              <p>
                Ορισμένα δεδομένα αποθηκεύονται τοπικά για απόδοση και offline χρήση. Η τοπική διαγραφή είναι δυνατή
                μέσω ελέγχων εφαρμογής όπου υπάρχουν.
              </p>
              <p>
                Το TaleTime δεν πωλεί προσωπικά δεδομένα. Ενδέχεται να κοινοποιεί δεδομένα σε εξουσιοδοτημένους
                εκτελούντες επεξεργασία και για λόγους συμμόρφωσης, ασφάλειας, προστασίας δικαιωμάτων ή αποτροπής
                άμεσης βλάβης.
              </p>
              <p>
                Τα δεδομένα διατηρούνται μόνο όσο απαιτείται εύλογα για λειτουργικούς, νομικούς, ασφαλείας και
                σκοπούς επίλυσης διαφορών. Οι περίοδοι διατήρησης διαφέρουν ανά κατηγορία και δικαιοδοσία.
              </p>
              <p>
                Ανάλογα με την περιοχή σας, μπορεί να έχετε δικαιώματα πρόσβασης, διόρθωσης, διαγραφής, περιορισμού,
                εναντίωσης ή φορητότητας. Για άσκηση δικαιωμάτων, χρησιμοποιήστε τα κανάλια επαφής με επαρκή στοιχεία
                επαλήθευσης.
              </p>
            </div>
          ),
        },
        faq: {
          title: UI_TEXT.el.linkLabels.faq,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <div>
                <p className="font-semibold">1. Μπορώ να διαβάζω βιβλία offline;</p>
                <p>Μόνο μετά από επιτυχή τοπική αποθήκευση· εξαρτάται από χώρο, πρόγραμμα και ακεραιότητα cache.</p>
              </div>
              <div>
                <p className="font-semibold">2. Μπορώ να αλλάζω μεταξύ πλήρους και bedtime έκδοσης;</p>
                <p>Η επιλογή αλλάζει από την αρχική σελίδα και μπορεί να επαναφερθεί μετά από καθαρισμό δεδομένων.</p>
              </div>
              <div>
                <p className="font-semibold">3. Πώς αναφέρω λανθασμένο περιεχόμενο;</p>
                <p>Χρησιμοποιήστε feedback εντός εφαρμογής με τίτλο, κατηγορία προβλήματος και βήματα αναπαραγωγής.</p>
              </div>
              <div>
                <p className="font-semibold">4. Χρειάζομαι λογαριασμό για ανάγνωση;</p>
                <p>Ορισμένες λειτουργίες είναι διαθέσιμες χωρίς σύνδεση· συγχρονισμός και λειτουργίες λογαριασμού όχι.</p>
              </div>
              <div>
                <p className="font-semibold">5. Πώς καθαρίζω τοπικά δεδομένα;</p>
                <p>Χρησιμοποιήστε ελέγχους αποθήκευσης/cache· ενδέχεται να χαθούν offline βιβλία και πρόοδος.</p>
              </div>
              <div>
                <p className="font-semibold">6. Παρέχει το TaleTime νομικές ή εκπαιδευτικές εγγυήσεις;</p>
                <p>Όχι. Το περιεχόμενο είναι ενημερωτικό και δεν υποκαθιστά νομική, κλινική ή πιστοποιημένη αξιολόγηση.</p>
              </div>
              <div>
                <p className="font-semibold">7. Ποιος κατέχει και λειτουργεί το TaleTime;</p>
                <p>Το TaleTime σχεδιάζεται, αναπτύσσεται, ανήκει και λειτουργεί από την CloverTree Technologies, LLC.</p>
              </div>
            </div>
          ),
        },
        contact: {
          title: UI_TEXT.el.linkLabels.contact,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>Η υποστήριξη και οι επικοινωνίες πολιτικής του TaleTime διαχειρίζονται από την CloverTree Technologies, LLC.</p>
              <p>Για τεχνική βοήθεια, χρησιμοποιήστε τη φόρμα feedback εντός εφαρμογής.</p>
              <p>Συμπεριλάβετε τύπο συσκευής, σύντομη περιγραφή και βήματα αναπαραγωγής προβλήματος.</p>
              <p>Για αιτήματα λογαριασμού, συνδεθείτε πριν την υποβολή.</p>
              <p>Για νομικά, απορρήτου ή συμμόρφωσης θέματα, δηλώστε σαφώς την κατηγορία αιτήματος.</p>
            </div>
          ),
        },
        safety: {
          title: UI_TEXT.el.linkLabels.safety,
          body: (
            <div className="space-y-3 text-sm text-tt-primary">
              <p>
                Το TaleTime εφαρμόζει ελέγχους για ηλικιακά κατάλληλη χρήση· ωστόσο κανένα αυτοματοποιημένο σύστημα
                δεν εγγυάται πλήρη αποτροπή ακατάλληλου υλικού.
              </p>
              <p>
                Οι διαδικασίες παιδικής ασφάλειας του TaleTime διαχειρίζονται από την CloverTree Technologies, LLC
                σύμφωνα με πολιτικές προϊόντος, προστασίες πλατφόρμας και ισχύουσες νομικές υποχρεώσεις.
              </p>
              <div>
                <p className="font-semibold">1. Δεσμεύσεις ασφάλειας</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Χρήση σημάτων καταλληλότητας ηλικίας σε ανακάλυψη και παρουσίαση.</li>
                  <li>Έλεγχος αναφορών και εφαρμογή μέτρων εποπτείας βάσει πολιτικής.</li>
                  <li>Μηχανισμοί κατά κατάχρησης για μείωση επιβλαβούς χρήσης και παραβίασης λογαριασμών.</li>
                  <li>Επιλογές ρύθμισης για εποπτεία από κηδεμόνες.</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold">2. Ευθύνες κηδεμόνων</p>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                  <li>Επιβλέπετε επιλογές περιεχομένου για ανηλίκους, ειδικά μικρότερα παιδιά.</li>
                  <li>Χρησιμοποιείτε ελέγχους συσκευής και κανόνες νοικοκυριού.</li>
                  <li>Προστατεύετε διαπιστευτήρια και αποφεύγετε δημόσια έκθεση στοιχείων παιδιών.</li>
                  <li>Αναφέρετε άμεσα ύποπτο, επιβλαβές ή παραβιαστικό περιεχόμενο.</li>
                </ul>
              </div>
              <p>
                Σε άμεσο κίνδυνο, επικοινωνήστε πρώτα με υπηρεσίες έκτακτης ανάγκης ή αρμόδιες αρχές παιδικής
                προστασίας. Η in-app αναφορά δεν είναι επίσημος επείγων μηχανισμός.
              </p>
              <p>
                Στον μέγιστο βαθμό που επιτρέπεται από τον νόμο, το TaleTime αποποιείται ευθύνη για αλλαγές πηγών
                τρίτων, κενά εποπτείας ή ρυθμίσεις δικτύου/συσκευής εκτός εύλογου ελέγχου.
              </p>
            </div>
          ),
        },
      };
    }

    return englishContent;
  }, [locale, englishContent]);

  const year = new Date().getFullYear();

  return (
    <>
      <footer className="tt-surface mt-8 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-tt-muted">
            <Shield className="h-4 w-4 text-tt-tertiary" />
            <span>
              © {year} TaleTime · {uiText.footerPrefix}{' '}
              <a
                href="https://clovertreetech.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:text-tt-accent hover:underline underline-offset-4"
              >
                CloverTree Technologies, LLC
              </a>{' '}
              {uiText.footerSuffix}
            </span>
          </div>

          <nav aria-label={uiText.navLabel} className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {LINK_ITEMS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActiveKey(item)}
                className="text-sm font-medium text-tt-primary hover:text-tt-accent hover:underline underline-offset-4"
              >
                {uiText.linkLabels[item]}
              </button>
            ))}
          </nav>
        </div>
      </footer>

      {activeKey && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={descriptionId}
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/60"
                aria-label="Close footer dialog"
                onClick={() => setActiveKey(null)}
              />

              <div
                className="relative w-full max-w-4xl rounded-tt bg-tt-surface border border-tt-border/30 shadow-tt flex flex-col overflow-hidden"
                style={{ maxHeight: 'calc(100vh - 2rem)' }}
              >
                <div className="flex items-start justify-between gap-3 border-b border-tt-border/20 p-5">
                  <div>
                    <h2 id={titleId} className="text-xl font-black text-tt-tertiary">
                      {activeContent[activeKey].title}
                    </h2>
                    <p id={descriptionId} className="mt-1 text-sm text-tt-muted">
                      {uiText.modalSubtitle}
                    </p>
                  </div>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={() => setActiveKey(null)}
                    className="rounded-full p-2 text-tt-muted hover:bg-tt-tertiary/10"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto p-5">
                  <div className="rounded-tt border border-tt-border/20 bg-tt-secondary/20 p-3 text-xs text-tt-muted flex items-center gap-2">
                    <LifeBuoy className="h-4 w-4 text-tt-tertiary" />
                    <span>{uiText.quickReference}</span>
                  </div>

                  {activeContent[activeKey].body}
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </>
  );
}