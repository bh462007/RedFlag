export type ClauseTone = 'danger' | 'warn' | 'safe';

export type ClauseVariant = {
  id: string;
  label: string;
  text: string;
  tone: ClauseTone;
  plain: string;
  hindi?: string;
  whyItMatters: string;
};

export type Clause = {
  id: string;
  title: string;
  number: string;
  category: string;
  summary: string;
  variants: ClauseVariant[];
};

export type LeaseFact = {
  label: string;
  value: string;
  hint?: string;
};

export type LeaseMeta = {
  propertyType: string;
  locality: string;
  city: string;
  termMonths: number;
  rentPerMonth: number;
  maintenancePerMonth: number;
  deposit: number;
  lockInMonths: number;
  noticeMonths: number;
  rentIncreasePerYearPct: number;
};

export type ReadingOptions = {
  fontSize: 'comfortable' | 'large';
  showHindi: boolean;
  plainLanguage: boolean;
};

export const defaultReadingOptions: ReadingOptions = {
  fontSize: 'comfortable',
  showHindi: false,
  plainLanguage: true,
};

export const lease: LeaseMeta = {
  propertyType: '1BHK',
  locality: 'Indiranagar',
  city: 'Bengaluru',
  termMonths: 11,
  rentPerMonth: 28000,
  maintenancePerMonth: 3500,
  deposit: 168000,
  lockInMonths: 11,
  noticeMonths: 2,
  rentIncreasePerYearPct: 10,
};

export const leaseFacts: LeaseFact[] = [
  { label: 'Property', value: '1BHK, Indiranagar, Bengaluru' },
  { label: 'Term', value: '11 months' },
  { label: 'Rent', value: '₹28,000 / month' },
  { label: 'Maintenance', value: '₹3,500 / month' },
  { label: 'Security deposit', value: '₹1,68,000', hint: '6 months of rent' },
  { label: 'Lock-in period', value: '11 months' },
  { label: 'Notice period', value: '2 months' },
  { label: 'Rent increase', value: '10% per year' },
];

export type ActionItem = {
  id: string;
  title: string;
  detail: string;
  request: string;
};

export const actionItems: ActionItem[] = [
  {
    id: 'deposit-refund',
    title: 'Set a refund deadline for the deposit',
    detail:
      '₹1,68,000 is six months of rent. The lease returns it "at the landlord’s discretion" with no date.',
    request:
      'Please refund the security deposit within 30 days of vacating, after deducting only unpaid rent and documented repairs shared in writing.',
  },
  {
    id: 'deposit-deductions',
    title: 'Require written, documented deductions',
    detail:
      'Right now the landlord alone assesses damages, which leaves you open to inflated claims.',
    request:
      'Any deduction from the deposit should be backed by an itemised list with bills or photos, shared before the amount is withheld.',
  },
  {
    id: 'lock-in-penalty',
    title: 'Replace deposit forfeiture with a fair penalty',
    detail:
      'Leaving during the 11-month lock-in forfeits your entire ₹1,68,000 — six months of rent in one hit.',
    request:
      'If I leave during the lock-in, let the penalty be one month’s rent (₹28,000) plus notice, rather than forfeiting the full deposit.',
  },
  {
    id: 'lock-in-mutual',
    title: 'Make the lock-in work both ways',
    detail:
      'The lease penalises only you for leaving early. The landlord faces no equivalent for asking you to leave.',
    request:
      'The lock-in should bind both sides. If the landlord ends the lease during the lock-in, they pay an equal penalty to me.',
  },
  {
    id: 'rent-increase',
    title: 'Cap the yearly rent increase at 5%',
    detail:
      'The lease raises rent 10% every year — double the typical 5% in Bengaluru. Over two terms that adds up fast.',
    request:
      'Cap the yearly rent increase at 5%, and apply it only on renewal, not mid-term.',
  },
  {
    id: 'notice-flexibility',
    title: 'Allow notice to count from the day it is given',
    detail:
      'A 2-month notice is reasonable, but only if the clock starts when you send it — not when the landlord acknowledges it.',
    request:
      'Treat the notice period as starting on the date I send it in writing (email or registered post), regardless of when it is acknowledged.',
  },
];

export const clauses: Clause[] = [
  {
    id: 'deposit',
    title: 'Security deposit',
    number: 'Clause 4',
    category: 'Money',
    summary:
      'A refundable amount you pay upfront and get back when you move out, minus any deductions.',
    variants: [
      {
        id: 'deposit-fair',
        label: 'Fair',
        text: 'The tenant shall pay a security deposit of ₹1,68,000, refundable within 30 days of vacating, after deducting unpaid rent and documented repairs.',
        tone: 'safe',
        plain:
          'You pay ₹1,68,000 upfront. You get it back within 30 days of moving out, minus any rent you still owe or the cost of repairs — and those repairs have to be written down, not just claimed.',
        hindi:
          'आप ₹1,68,000 एडवांस देते हैं। निकलते समय 30 दिन में वापस मिलेंगे, बशर्ते बकाया किराया या लिखित मरम्मत का कटौती हो।',
        whyItMatters:
          'A written deduction list and a 30-day deadline protect you from the landlord keeping your money without explaining why.',
      },
      {
        id: 'deposit-risk',
        label: 'Risky',
        text: 'The tenant shall pay a security deposit of ₹1,68,000. The deposit shall be refunded at the landlord’s discretion upon vacating, less any damages assessed by the landlord.',
        tone: 'danger',
        plain:
          'You pay ₹1,68,000 upfront. You get it back whenever the landlord decides, minus whatever the landlord says the damages are — no deadline, no proof required.',
        hindi:
          'आप ₹1,68,000 देते हैं। वापसी मकान मालिक की मर्जी पर, उनके बताए नुकसान घटाकर — कोई समय सीमा या प्रमाण नहीं।',
        whyItMatters:
          '“At the landlord’s discretion” with no deadline means you have little leverage to get your money back, and inflated damage claims are hard to fight.',
      },
    ],
  },
  {
    id: 'lock-in',
    title: 'Lock-in period',
    number: 'Clause 7',
    category: 'Term',
    summary:
      'A window during which neither you nor the landlord can end the lease early without a penalty.',
    variants: [
      {
        id: 'lock-in-fair',
        label: 'Fair',
        text: 'The agreement shall be locked in for 11 months. Either party may terminate after the lock-in with 2 months’ written notice.',
        tone: 'safe',
        plain:
          'For the first 11 months neither side can end the lease early. After that, either of you can end it by giving 2 months’ notice in writing.',
        hindi:
          'पहले 11 महीने किसी भी पक्ष के लिए समयपूर्व समाप्ति नहीं। बाद में 2 महीने के लिखित नोटिस पर कोई भी समाप्त कर सकता है।',
        whyItMatters:
          'A lock-in that matches the full term, plus a clear notice rule afterward, keeps things predictable without trapping you.',
      },
      {
        id: 'lock-in-risk',
        label: 'Risky',
        text: 'The tenant shall not vacate for 11 months. If the tenant vacates during the lock-in, the full deposit shall be forfeited.',
        tone: 'danger',
        plain:
          'You cannot leave for 11 months. If you do leave during that time, the landlord keeps your entire ₹1,68,000 deposit — no matter the reason.',
        hindi:
          '11 महीने तक आप नहीं छोड़ सकते। इस दौरान छोड़ने पर पूरा ₹1,68,000 जमानत जब्त होगी — वजह कोई भी हो।',
        whyItMatters:
          'One-sided lock-ins that only penalise you, and tie the penalty to your full deposit, can cost you the equivalent of six months of rent.',
      },
    ],
  },
];
