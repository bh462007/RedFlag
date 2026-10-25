export type FixtureSeverity = 'severe' | 'high' | 'medium' | 'low';

export type AnalysisFixture = {
  id: string;
  text: string;
  expectedWarningSigns: string[];
  acceptableSeverityRange: FixtureSeverity[];
  mustNotClaim: string[];
};

export const analysisFixtures: AnalysisFixture[] = [
  {
    id: 'legitimate-interview',
    text: 'Thank you for applying for our summer software internship. Please choose an interview slot through our university careers portal. No payment is required.',
    expectedWarningSigns: [],
    acceptableSeverityRange: [],
    mustNotClaim: ['Do not call the message a scam because the employer is unfamiliar.'],
  },
  {
    id: 'legitimate-onboarding',
    text: 'We are pleased to offer a paid internship. Please review the offer and provide your availability for orientation. We will never ask for payment.',
    expectedWarningSigns: [],
    acceptableSeverityRange: [],
    mustNotClaim: ['Do not infer fraud from a paid stipend or ordinary onboarding.'],
  },
  {
    id: 'registration-fee',
    text: 'An upfront 2,500 registration fee is requested within 48 hours. The amount will be refunded with your first salary.',
    expectedWarningSigns: ['registration fee', 'within 48 hours', 'refunded with your first salary'],
    acceptableSeverityRange: ['high', 'medium'],
    mustNotClaim: ['Do not claim the company is verified fraudulent or that the refund will definitely fail.'],
  },
  {
    id: 'training-fee-before-offer',
    text: 'Selected candidates must pay a 4,999 mandatory training fee before receiving their offer letter.',
    expectedWarningSigns: ['pay a 4,999 mandatory training fee', 'before receiving their offer letter'],
    acceptableSeverityRange: ['severe'],
    mustNotClaim: ['Do not claim every training fee is fraudulent.'],
  },
  {
    id: 'otp-request',
    text: 'Send the OTP you receive on your phone so HR can complete your internship verification.',
    expectedWarningSigns: ['Send the OTP'],
    acceptableSeverityRange: ['severe'],
    mustNotClaim: ['Do not claim an account was compromised or identify the sender as a confirmed criminal.'],
  },
  {
    id: 'credential-request',
    text: 'Reply with your email password, bank account login, and debit-card details for stipend setup.',
    expectedWarningSigns: ['email password', 'bank account login', 'debit-card details'],
    acceptableSeverityRange: ['severe'],
    mustNotClaim: ['Do not claim access already occurred or infer a particular bank identity.'],
  },
  {
    id: 'salary-guarantee',
    text: 'Guaranteed 200,000 per month for a two-week beginner internship. No interview required.',
    expectedWarningSigns: ['Guaranteed 200,000 per month', 'two-week beginner internship'],
    acceptableSeverityRange: ['high', 'medium'],
    mustNotClaim: ['Do not state the salary is impossible as a factual certainty.'],
  },
  {
    id: 'placement-guarantee',
    text: 'Receive a guaranteed job placement after completing our three-day online internship.',
    expectedWarningSigns: ['guaranteed job placement', 'three-day online internship'],
    acceptableSeverityRange: ['high', 'medium'],
    mustNotClaim: ['Do not claim the provider is fraudulent solely because placement is promised.'],
  },
  {
    id: 'urgent-threat',
    text: 'Your application will be permanently cancelled in 30 minutes unless you click this link and submit your identity details.',
    expectedWarningSigns: ['permanently cancelled in 30 minutes', 'click this link', 'submit your identity details'],
    acceptableSeverityRange: ['high'],
    mustNotClaim: ['Do not claim the link is malicious or identity theft occurred without evidence.'],
  },
  {
    id: 'generic-recruiter',
    text: 'Hi, we found your profile and have an internship opportunity. Let us know if interested.',
    expectedWarningSigns: [],
    acceptableSeverityRange: [],
    mustNotClaim: ['Do not call it a scam because of a generic greeting or missing details alone.'],
  },
  {
    id: 'personal-email',
    text: 'We would like to discuss a remote internship. Please reply with your availability. More details will follow from this personal email address.',
    expectedWarningSigns: ['personal email address'],
    acceptableSeverityRange: ['low'],
    mustNotClaim: ['Do not treat a personal email address or missing company details as proof of fraud.'],
  },
  {
    id: 'ambiguous-form',
    text: 'You are shortlisted for a remote internship. Please complete this form by Friday. Stipend and role details will be discussed during the call.',
    expectedWarningSigns: [],
    acceptableSeverityRange: [],
    mustNotClaim: ['Do not treat a routine form deadline as proof of fraud or invent a fee, credential request, malicious link, or company verification result.'],
  },
];
