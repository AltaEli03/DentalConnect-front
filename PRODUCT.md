# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Patients in Mexico** looking for a dental clinic and requesting an appointment without calling. Primary audience, usually on a phone, comparing location, services, specialists, and price.
- **Clinic administrators** managing the clinic's public profile, services, dentists, schedules, and incoming appointment requests.
- **Platform administrators** reviewing clinic registration requests before a clinic is published.

## Product Purpose

DentalConnect is a directory of dental clinics with an online appointment-request flow. Patients compare clinics by location, services, and specialists, then send a request. The clinic confirms it or proposes another time; the patient accepts or rejects. Success means a patient can choose a clinic and request care without a phone call, and a clinic can manage its public information and requests in one place.

## Positioning

A reviewed directory: clinic registrations are approved by the platform before publication, and every clinic publishes its own services, specialists, and contact data. The appointment request is a first-class flow, not a phone number buried in a profile.

The product does not process payments, ratings, reviews, maps, or insurance. It displays the clinic data and availability the API returns.

## Operating Context

- Spanish (Mexico), mobile-first. Patients browse on phones; clinic staff often work from a desktop.
- Light, dark, and system themes. The choice persists locally.
- Installable PWA with a splash screen and push notifications for appointment updates.
- Appointment lifecycle: pending, confirmed, proposed alternative, rejected, cancelled; proposals expire.
- Time zone is handled explicitly in the UI. Dates and times are shown in the clinic's time zone.
- Three roles: patient, clinic administrator, platform administrator. Routes and navigation change with the role.

## Capabilities and Constraints

- React 19, Vite 6, TypeScript, Tailwind 4, Vitest 4. No backend changes in scope.
- The API is the source of truth. Do not invent ratings, reviews, availability, prices, or clinic data.
- Prices are "desde" amounts per service, not final quotes.
- Clinic images are optional and vary in quality. Some clinics have no image.
- Existing routes, authentication, theme behavior, PWA behavior, and API contracts must remain.
- No new dependencies unless a real need cannot be met with the current stack.
- `npm run test`, `npm run lint`, `npm run build`, and `npm run test:contrast` must stay green.

## Brand Commitments

- The name **DentalConnect**, the two-tone wordmark, and the existing palette: deep teal `#003B4A`, aqua `#007C83`, coral `#B6412C`, pearl surfaces.
- Outfit for display type and Inter for interface and body text, self-hosted.
- The clinic card is a retained brand asset: photo, location, name, address, description, service chips, and a "Ver detalles" action.
- Voice: Spanish (Mexico), calm, direct, no exclamation marks, no emoji as interface icons, no unsupported claims.
- The directory should feel trustworthy and human, not like a generic marketplace template.

## Evidence on Hand

- Real clinic data comes from the API: name, description, contact data, address, services, dentists, schedules.
- Existing screenshots of the directory live in `specs/tec-09-pruebas-integrales-permisos-accesibilidad/screenshots/`.
- There are no testimonials, ratings, review counts, benchmarks, or customer logos. Do not fabricate them.
- There are no legal pages or insurance/payment claims. Do not invent them.

## Product Principles

1. **Clarity before decoration.** Every screen answers what this is and what the patient or clinic can do next.
2. **One system.** Patients, clinic staff, and platform staff share the same tokens, components, and interaction rules.
3. **Real data only.** Empty and missing values are stated honestly; no invented social proof.
4. **Scannable by default.** Lists, tables, and cards earn their space; the directory is optimized for comparison.
5. **Calm trust.** The interface is quiet, legible, and accessible; the clinic's information, not the interface, is the protagonist.

## Accessibility & Inclusion

- WCAG 2.2 AA: contrast, keyboard access, visible focus, semantic HTML, labels, and understandable errors.
- Touch targets of at least 44 px.
- `prefers-reduced-motion` respected; no decorative motion.
- Dark mode is a supported theme, not an afterthought.
- Messages use plain Spanish and state what happened and what to do next.
